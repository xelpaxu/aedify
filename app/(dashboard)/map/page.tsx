'use client'

import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from 'next/dynamic'
import {
  ChevronDown, ShieldCheck, Zap, MapPin, Layers, Crosshair,
  FlaskConical, X, Calendar, User, AlertTriangle, CheckCircle,
  Clock, ChevronRight, ArrowRight, Bot, Sparkles
} from "lucide-react"
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import SimulationField from '../../../src/components/dashboard/SimulationField'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { applyCoordinateOffsets, extractConfidenceScore, formatReportLocation } from '../../../src/lib/geoUtils'
import { mockReports } from '../../../src/lib/mockData'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Helper to validate and create image URL from base64 or path (matching reports/page.tsx logic)
function getValidImageUrl(img: any): string | null {
  if (!img || typeof img !== 'string') return null
  const cleanImg = img.trim()
  if (cleanImg.length === 0) return null

  if (
    cleanImg.startsWith('http://') ||
    cleanImg.startsWith('https://') ||
    cleanImg.startsWith('data:')
  ) {
    return cleanImg
  }

  if (cleanImg.startsWith('/assets/') || cleanImg.startsWith('/images/')) {
    return cleanImg
  }

  if (cleanImg.startsWith('assets/') || cleanImg.startsWith('images/')) {
    return `/${cleanImg}`
  }

  return `data:image/jpeg;base64,${cleanImg}`
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Dynamic imports
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Initializing High-Performance Risk Map...</p>
        </div>
      </div>
    )
  }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

// Pre-cached icon instances to eliminate garbage collection & lag on re-renders
const iconCache = new Map<string, L.DivIcon>()

function getCachedMapPin(status?: string, verified?: boolean): L.DivIcon {
  const s = status?.toUpperCase() || 'PENDING'
  const key = `${s}_${verified ? 'V' : 'U'}`

  if (iconCache.has(key)) {
    return iconCache.get(key)!
  }

  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (s === 'CRITICAL' || s === 'HIGH') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (s === 'MODERATE' || s === 'MEDIUM' || s === 'PENDING' || !verified) {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = 40
  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      <img
        src="${iconUrl}"
        alt="Hotspot Pin"
        class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom group-hover:scale-125 select-none pointer-events-none"
        style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));"
      />
    </div>
  `

  const icon = L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size],
  })

  iconCache.set(key, icon)
  return icon
}

interface Sector {
  name: string
  center: [number, number]
  zoom: number
}

const SECTOR_VIEWS: Record<string, Sector> = {
  molo_district: { name: "Molo District", center: [10.6953, 122.5447], zoom: 14 },
  san_juan: { name: "San Juan, Molo", center: [10.688934, 122.544069], zoom: 17 },
  calumpang: { name: "Calumpang, Molo", center: [10.684981, 122.537642], zoom: 17 },
  south_fundidor: { name: "South Fundidor, Molo", center: [10.690069, 122.531907], zoom: 17 },
}

// Smooth, non-blocking map controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Guard: map must be fully initialized and still attached to a live DOM node
    const isMapUsable = () => {
      try {
        return !!map && map._loaded && !!map.getContainer() && document.body.contains(map.getContainer())
      } catch {
        return false
      }
    }

    if (!isMapUsable()) return

    // Defer to next frame so we don't race React's own commit/unmount cycle
    // (important under Strict Mode's mount->unmount->mount dance in dev)
    const frame = requestAnimationFrame(() => {
      if (!isMapUsable()) return
      try {
        map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 })
      } catch (err) {
        // Only attempt the fallback if the map is still usable —
        // otherwise we're just triggering the same crash again.
        if (isMapUsable()) {
          try {
            map.setView(center, zoom)
          } catch {
            // Map is in a bad state; nothing safe left to do here.
            console.warn('MapController: setView fallback failed, map likely unmounted mid-animation')
          }
        }
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      // Stop any in-flight pan/zoom animation before this effect's cleanup
      // runs, so Leaflet doesn't keep animating a map that's about to unmount.
      if (isMapUsable() && typeof map.stop === 'function') {
        try {
          map.stop()
        } catch {
          // no-op — map already gone
        }
      }
    }
  }, [center, zoom, map])

  return null
}

function ReportDetailPanel({ report, onClose }: { report: any; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()

  const rawImage = report?.processedImage || report?.imageUri || report?.rawPhoto || report?.imageUrl
  const validImageUrl = useMemo(() => getValidImageUrl(rawImage), [rawImage])

  const [imgSrc, setImgSrc] = useState<string>(() => validImageUrl || '/assets/images/breeding-site.jpeg')
  const [imgFailed, setImgFailed] = useState(false)

  // Reset state when report changes
  useEffect(() => {
    setImgSrc(validImageUrl || '/assets/images/breeding-site.jpeg')
    setImgFailed(false)
  }, [validImageUrl, report?._id])

  if (!report) return null

  const statusConfig = (() => {
    switch (report.status?.toLowerCase()) {
      case 'critical': return { color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', label: t('critical') }
      case 'verified': return { color: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('verified') }
      default: return { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: t('pending') }
    }
  })()

  const confidenceScore = extractConfidenceScore(report)
  const formattedAddress = formatReportLocation(report)

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] max-w-full bg-white z-[500] shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
      {/* Header */}
      <div className="relative h-48 bg-slate-950 shrink-0 overflow-hidden">
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt={formattedAddress}
            className="w-full h-full object-cover opacity-80"
            onError={() => {
              if (imgSrc !== '/assets/images/breeding-site.jpeg') {
                setImgSrc('/assets/images/breeding-site.jpeg')
              } else {
                setImgFailed(true)
              }
            }}
          />
        ) : (
          /* Fallback UI */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 to-slate-950/90 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="text-primary-400/50 mx-auto mb-2" />
              <p className="text-white/40 text-xs font-medium">No Image Available</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white ${statusConfig.color} shadow-sm`}>
            {statusConfig.label}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
            <ShieldCheck size={10} /> Verified
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h2 className="text-white font-bold text-base leading-tight mb-1">{formattedAddress}</h2>
          <div className="flex items-center gap-3 text-white/70 text-xs">
            <span className="flex items-center gap-1"><User size={12} /> {report.userName || 'Tanod Officer'}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Content - keep the same */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-base font-black text-slate-900">{confidenceScore}%</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Confidence</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-base font-black text-slate-900">{report.detections?.length || 1}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Detections</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <p className={`text-base font-black ${statusConfig.text}`}>{report.status || 'Verified'}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Status</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Field Observation</h3>
          <p className="text-xs text-slate-700 leading-relaxed">{report.description || 'Verified mosquito breeding hotspot.'}</p>
        </div>

        {/* AI Analysis */}
        <div className="bg-slate-900 p-4 rounded-2xl text-white space-y-2">
          <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bot size={13} /> AI Vector Analysis
          </h3>
          <p className="text-xs text-slate-200 italic leading-relaxed">&quot;{report.reasoning || 'Larval proliferation index elevated within standing water sector.'}&quot;</p>
        </div>

        {/* Coordinates */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <Crosshair size={13} className="text-primary-600" />
            {report.lat?.toFixed(5)}, {report.lng?.toFixed(5)}
          </span>
          <span className="text-[10px] font-sans font-bold text-slate-400">GPS Verified</span>
        </div>

        {/* Detections */}
        {report.detections && report.detections.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Classified Breeding Vectors</h3>
            <div className="flex flex-wrap gap-1.5">
              {report.detections.map((d: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50">
        <Link
          href={`/reports/${report._id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-md shadow-primary-500/20 active:scale-[0.98]"
        >
          View Full Surveillance Record
          <ArrowRight size={14} />
        </Link>
        <button
          onClick={() => router.push(`/assignments?reportId=${report._id}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition active:scale-[0.98]"
        >
          {t('assignTanodTeam')}
        </button>
      </div>
    </div>
  )
}

export default function RiskMapPage() {
  const [mapType, setMapType] = useState<"street" | "satellite">("satellite")
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<Sector>(SECTOR_VIEWS.molo_district)
  const [showSim, setShowSim] = useState(false)

  const { user } = useAuth()
  const { t } = useLanguage()
  const allReports = useQuery(api.reports.getAllReports)

  // 1. Strict filtering: ONLY include reports where verified is true from database
  const verifiedRaw = useMemo(() => {
    // Show nothing while loading - don't use mock data
    if (allReports === undefined) {
      return []  // Return empty array, not mock data
    }

    if (allReports && allReports.length > 0) {
      const filtered = allReports
        .filter(r => r.verified === true && r.status !== "Completed" && r.status !== "dismissed")
        .map(r => ({
          ...r,
          imageUri: r.imageUri || r.processedImage || '',
          processedImage: r.processedImage || r.imageUri || '',
          rawPhoto: r.imageUri || r.processedImage || '',
        }))

      // If we have real reports, use them (even if none are verified)
      if (filtered.length > 0) {
        console.log(`✅ Using ${filtered.length} verified reports from Convex`)
        return filtered
      }

      // If there are reports but none are verified, show empty state
      if (allReports.length > 0) {
        console.log(`⚠️ Found ${allReports.length} reports, but none are verified yet`)
        return []
      }
    }

    // Only use mock data if allReports is empty (not undefined)
    if (allReports !== undefined && allReports.length === 0) {
      console.log('📦 No reports in database, using mock data for testing')
      return mockReports.filter(m => m.status === 'OPEN').map(m => ({
        _id: m.id as any,
        lat: m.coordinates[0],
        lng: m.coordinates[1],
        locationName: m.location,
        status: m.risk === 'High' ? 'CRITICAL' : m.risk === 'Medium' ? 'MODERATE' : 'SAFE',
        verified: true,
        accuracy: typeof m.confidence === 'number' ? m.confidence : 85,
        userName: 'Tanod Patrol',
        description: m.title,
        detections: [m.classification],
        reasoning: 'High mosquito activity and potential breeding habitat identified.',
        _creationTime: m.timestamp instanceof Date ? m.timestamp.getTime() : Date.now(),
        imageUri: m.rawPhoto || '/assets/images/breeding-site.jpeg',
        processedImage: m.rawPhoto || '/assets/images/breeding-site.jpeg',
        userId: 'mock-user-id',
      })) as any[]
    }

    return []
  }, [allReports])

  // 2. Coordinate offset algorithm to prevent piling up of markers at the same GPS coordinates
  const offsetHotspots = useMemo(() => {
    return applyCoordinateOffsets(verifiedRaw, 0.00032)
  }, [verifiedRaw])

  const selectedReport = useMemo(() => {
    return offsetHotspots.find(r => r._id === selectedReportId) || null
  }, [offsetHotspots, selectedReportId])

  useEffect(() => {
    if (user?.role === 'brgy-calumpang') setCurrentView(SECTOR_VIEWS.calumpang)
    if (user?.role === 'brgy-sanjuan') setCurrentView(SECTOR_VIEWS.san_juan)
    if (user?.role === 'brgy-southfundidor') setCurrentView(SECTOR_VIEWS.south_fundidor)
  }, [user?.role])

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedReportId(id)
  }, [])

  return (
    <>
      {showSim && (
        <SimulationField
          onClose={() => setShowSim(false)}
          reports={offsetHotspots.map((r: any) => ({
            _id: r._id,
            lat: r.displayLat,
            lng: r.displayLng,
            locationName: r.locationName,
            status: r.status,
            verified: r.verified,
            accuracy: r.accuracy,
          }))}
        />
      )}

      <div className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9rem)] w-full relative overflow-hidden animate-fade-in rounded-3xl border border-slate-200 shadow-md flex">
        <div className="flex-1 relative">
          {/* Stable single MapContainer instance for fast 60fps rendering */}
          <MapContainer
            center={currentView.center}
            zoom={currentView.zoom}
            className="w-full h-full z-0"
            zoomControl={false}
            preferCanvas={true}
          >
            {mapType === "street" ? (
              <TileLayer
                attribution='&copy; Stadia Maps'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                keepBuffer={8}
              />
            ) : (
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                keepBuffer={8}
              />
            )}

            <MapController center={currentView.center} zoom={currentView.zoom} />

            {offsetHotspots.map((report) => (
              <Marker
                key={report._id}
                position={[report.displayLat, report.displayLng] as [number, number]}
                icon={getCachedMapPin(report.status, report.verified)}
                eventHandlers={{ click: () => handleMarkerClick(report._id) }}
              />
            ))}
          </MapContainer>

          {/* Top floating bar */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex items-start justify-between pointer-events-none">
            {/* Title */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md text-white rounded-2xl p-3.5 border border-white/10 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-black tracking-tight">{t('liveRiskMap')}</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {offsetHotspots.length} verified vector hotspots active
              </p>
            </div>

            {/* Simulation button */}
            <button
              onClick={() => setShowSim(true)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition-all active:scale-95 border border-primary-500/30"
            >
              <FlaskConical size={15} />
              <span>{t('enterSimulation')}</span>
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-4 z-[400] flex items-end gap-3 pointer-events-none">
            {/* Map type toggle */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex gap-0.5 shadow-lg">
              <button
                onClick={() => setMapType("satellite")}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 ${mapType === "satellite" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
              >
                <Layers size={13} /> {t('satellite')}
              </button>
              <button
                onClick={() => setMapType("street")}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all ${mapType === "street" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
              >
                {t('street')}
              </button>
            </div>

            {/* Sector selector */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden relative shadow-lg">
              <select
                className="bg-transparent pl-3.5 pr-8 py-2 text-xs font-bold text-white appearance-none cursor-pointer focus:outline-none"
                onChange={(e) => setCurrentView(SECTOR_VIEWS[e.target.value])}
                value={Object.keys(SECTOR_VIEWS).find(key => SECTOR_VIEWS[key] === currentView) || 'molo_district'}
              >
                {Object.entries(SECTOR_VIEWS).map(([key, sector]) => (
                  <option key={key} value={key} className="bg-slate-900 text-white">{sector.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            </div>
          </div>

          {/* Detail panel */}
          {selectedReport && (
            <ReportDetailPanel
              report={selectedReport}
              onClose={() => setSelectedReportId(null)}
            />
          )}
        </div>
      </div>
    </>
  )
}