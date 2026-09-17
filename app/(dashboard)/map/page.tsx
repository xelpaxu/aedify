'use client'

import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from 'next/dynamic'
import {
  ChevronDown, ShieldCheck, Zap, MapPin, Layers, Crosshair,
  FlaskConical, X, Calendar, User, AlertTriangle, CheckCircle,
  Clock, ChevronRight, ArrowRight, Bot, Sparkles, CheckCircle2,
  Loader2, Building
} from "lucide-react"
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import SimulationField from '../../../src/components/dashboard/SimulationField'
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  groupReportsByLocation,
  LocationCluster,
  extractConfidenceScore,
  formatReportLocation
} from '../../../src/lib/geoUtils'
import { normalizeReportImage } from '@/src/lib/reportImages'
import { mockReports } from '../../../src/lib/mockData'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

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

function getClusterMapPin(risk?: string, count: number = 1): L.DivIcon {
  const r = risk || 'Low'
  const key = `${r}_${count}`

  if (iconCache.has(key)) {
    return iconCache.get(key)!
  }

  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (r === 'High' || r === 'CRITICAL' || r === 'critical') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (r === 'Medium' || r === 'Moderate' || r === 'MODERATE' || r === 'moderate' || r === 'pending' || r === 'PENDING') {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = 42
  const badgeHtml = count > 1 ? `
    <div class="absolute -top-1.5 -right-1.5 z-20 flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-slate-950 text-white text-[11px] font-black rounded-full border-2 border-white shadow-lg">
      ${count}
    </div>
  ` : ''

  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      <img
        src="${iconUrl}"
        alt="Hotspot Pin"
        class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom group-hover:scale-125 select-none pointer-events-none"
        style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));"
      />
      ${badgeHtml}
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

    const isMapUsable = () => {
      try {
        return !!map && map._loaded && !!map.getContainer() && document.body.contains(map.getContainer())
      } catch {
        return false
      }
    }

    if (!isMapUsable()) return

    const frame = requestAnimationFrame(() => {
      if (!isMapUsable()) return
      try {
        map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 })
      } catch {
        if (isMapUsable()) {
          try {
            map.setView(center, zoom)
          } catch {
            console.warn('MapController: setView fallback failed')
          }
        }
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      if (isMapUsable() && typeof map.stop === 'function') {
        try {
          map.stop()
        } catch {
          // no-op
        }
      }
    }
  }, [center, zoom, map])

  return null
}

function AreaDetailPanel({
  cluster,
  onClose,
  onResolveArea
}: {
  cluster: LocationCluster | null
  onClose: () => void
  onResolveArea: (cluster: LocationCluster) => Promise<void>
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isResolving, setIsResolving] = useState(false)
  const [resolveSuccess, setResolveSuccess] = useState(false)

  if (!cluster) return null

  const topReport = cluster.topReport
  const topImageUrl = normalizeReportImage(topReport?.processedImage || topReport?.imageUri) || '/assets/images/breeding-site.jpeg'

  const statusConfig = (() => {
    switch (cluster.highestRisk) {
      case 'CRITICAL': return { color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', label: t('critical') }
      case 'RESOLVED': return { color: 'bg-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'All Resolved' }
      case 'MODERATE': return { color: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: t('verified') }
      default: return { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: t('pending') }
    }
  })()

  const handleResolveClick = async () => {
    setIsResolving(true)
    try {
      await onResolveArea(cluster)
      setResolveSuccess(true)
      setTimeout(() => setResolveSuccess(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[440px] max-w-full bg-white z-[500] shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
      {/* Header Banner */}
      <div className="relative h-44 bg-slate-950 shrink-0 overflow-hidden">
        <img
          src={topImageUrl}
          alt={cluster.locationName}
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white ${statusConfig.color} shadow-sm`}>
            {statusConfig.label}
          </span>
          {cluster.totalReports > 1 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-white border border-white/20 shadow-sm">
              {cluster.totalReports} Co-located Reports
            </span>
          )}
        </div>

        {/* Bottom Location Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h2 className="text-white font-bold text-base leading-tight mb-0.5">{cluster.locationHierarchy.formatted}</h2>
          <p className="text-white/70 text-xs flex items-center gap-1.5">
            <Building size={12} className="text-primary-400" />
            <span>{cluster.locationHierarchy.district}, {cluster.locationHierarchy.city}</span>
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Success Alert */}
        {resolveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            Area and all {cluster.totalReports} associated reports resolved successfully!
          </div>
        )}

        {/* Area Overview Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-base font-black text-slate-900">{cluster.totalReports}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Total Reports</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-base font-black text-rose-600">{cluster.criticalCount}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Critical</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-base font-black text-emerald-600">{cluster.resolvedCount}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Resolved</p>
          </div>
        </div>

        {/* Coordinates */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <Crosshair size={13} className="text-primary-600" />
            {cluster.lat.toFixed(5)}, {cluster.lng.toFixed(5)}
          </span>
          <span className="text-[10px] font-sans font-bold text-slate-400">GPS Verified</span>
        </div>

        {/* Individual Reports in This Area */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Individual Reports ({cluster.totalReports})
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">
              Linked Area Group
            </span>
          </div>

          <div className="space-y-2.5">
            {cluster.reports.map((report: any, index: number) => {
              const repImg = normalizeReportImage(report.processedImage || report.imageUri) || '/assets/images/breeding-site.jpeg'
              const isCrit = report.status?.toLowerCase() === 'critical' || report.risk === 'High'
              const isRes = report.status?.toLowerCase() === 'resolved' || report.status?.toLowerCase() === 'completed'
              const conf = extractConfidenceScore(report)

              return (
                <div
                  key={report._id || index}
                  className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-primary-300 transition-all shadow-sm space-y-2"
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200 relative">
                      <img
                        src={repImg}
                        alt="Report"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md ${
                          isRes
                            ? 'bg-slate-100 text-slate-700'
                            : isCrit
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isRes ? 'Resolved' : isCrit ? 'Critical Risk' : 'Verified'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {conf}% AI
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate mt-1">
                        {report.description || report.title || 'Breeding site hazard'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <User size={10} className="text-slate-400" />
                        {report.userName || 'Tanod Officer'} • {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {report.detections && report.detections.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {report.detections.map((det: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                          {det}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/reports/${report._id}`}
                      className="text-[11px] font-bold text-primary-700 hover:text-primary-900 flex items-center gap-1"
                    >
                      View Report Dossier
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50">
        {!cluster.isAllResolved ? (
          <button
            onClick={handleResolveClick}
            disabled={isResolving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-75"
          >
            {isResolving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Resolving All Reports in Area...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Resolve Entire Area ({cluster.totalReports} Incident{cluster.totalReports > 1 ? 's' : ''})
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-center text-xs font-bold border border-emerald-200">
            ✓ Entire Area Cleared & Resolved
          </div>
        )}

        <button
          onClick={() => router.push(`/assignments?reportId=${topReport._id}`)}
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
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<Sector>(SECTOR_VIEWS.molo_district)
  const [showSim, setShowSim] = useState(false)

  const { user } = useAuth()
  const { t } = useLanguage()
  const allReports = useQuery(api.reports.getAllReports)
  const resolveReportMutation = useMutation(api.reports.resolveReport)

  // 1. Strict filtering: ONLY include reports from database or fallback mock
  const verifiedRaw = useMemo(() => {
    if (allReports === undefined) {
      return []
    }

    if (allReports && allReports.length > 0) {
      const filtered = allReports
        .filter(r => r.verified === true && r.status !== "Completed" && r.status !== "dismissed")
        .map(r => ({
          ...r,
          imageUri: r.imageUri || r.processedImage || '',
          processedImage: r.processedImage || r.imageUri || '',
          rawPhoto: r.processedImage || r.imageUri || '',
        }))

      if (filtered.length > 0) {
        return filtered
      }
      return []
    }

    // Fallback to mock data if database is empty
    if (allReports !== undefined && allReports.length === 0) {
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

  // 2. Group reports by exact location without offsets
  const locationClusters: LocationCluster[] = useMemo(() => {
    return groupReportsByLocation(verifiedRaw)
  }, [verifiedRaw])

  const selectedCluster = useMemo(() => {
    return locationClusters.find(c => c.id === selectedClusterId) || null
  }, [locationClusters, selectedClusterId])

  useEffect(() => {
    if (user?.role === 'brgy-calumpang') setCurrentView(SECTOR_VIEWS.calumpang)
    if (user?.role === 'brgy-sanjuan') setCurrentView(SECTOR_VIEWS.san_juan)
    if (user?.role === 'brgy-southfundidor') setCurrentView(SECTOR_VIEWS.south_fundidor)
  }, [user?.role])

  const handleClusterClick = useCallback((id: string) => {
    setSelectedClusterId(id)
  }, [])

  const handleResolveArea = async (cluster: LocationCluster) => {
    const top = cluster.topReport
    if (top && top._id) {
      const idStr = String(top._id)
      if (!idStr.startsWith('#') && !idStr.startsWith('mock')) {
        await resolveReportMutation({
          reportId: top._id,
          resolutionNotes: `Area resolved at ${cluster.locationName}`
        })
      }
    }
  }

  return (
    <>
      {showSim && (
        <SimulationField
          onClose={() => setShowSim(false)}
          reports={verifiedRaw.map((r: any) => ({
            _id: r._id,
            lat: r.lat,
            lng: r.lng,
            locationName: r.locationName,
            status: r.status,
            verified: r.verified,
            accuracy: r.accuracy,
          }))}
        />
      )}

      <div className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9rem)] w-full relative overflow-hidden animate-fade-in rounded-3xl border border-slate-200 shadow-md flex">
        <div className="flex-1 relative">
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

            {locationClusters.map((cluster) => (
              <Marker
                key={cluster.id}
                position={[cluster.lat, cluster.lng] as [number, number]}
                icon={getClusterMapPin(cluster.highestRisk, cluster.totalReports)}
                eventHandlers={{ click: () => handleClusterClick(cluster.id) }}
              />
            ))}
          </MapContainer>

          {/* Top Floating Bar */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex items-start justify-between pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md text-white rounded-2xl p-3.5 border border-white/10 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-black tracking-tight">{t('liveRiskMap')}</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {verifiedRaw.length} verified hotspots across {locationClusters.length} location zones
              </p>
            </div>

            <button
              onClick={() => setShowSim(true)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition-all active:scale-95 border border-primary-500/30"
            >
              <FlaskConical size={15} />
              <span>{t('enterSimulation')}</span>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 z-[400] flex items-end gap-3 pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex gap-0.5 shadow-lg">
              <button
                onClick={() => setMapType("satellite")}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 ${mapType === "satellite" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                <Layers size={13} /> {t('satellite')}
              </button>
              <button
                onClick={() => setMapType("street")}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-all ${mapType === "street" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                {t('street')}
              </button>
            </div>

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

          {/* Area Sidepanel */}
          {selectedCluster && (
            <AreaDetailPanel
              cluster={selectedCluster}
              onClose={() => setSelectedClusterId(null)}
              onResolveArea={handleResolveArea}
            />
          )}
        </div>
      </div>
    </>
  )
}