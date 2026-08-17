'use client'

import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
import { 
  ChevronDown, ShieldCheck, Zap, MapPin, Layers, Crosshair, 
  FlaskConical, X, Calendar, User, AlertTriangle, CheckCircle,
  Clock, ChevronRight, ArrowRight, Bot
} from "lucide-react"
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import SimulationField from '../../../src/components/dashboard/SimulationField'
import { useRouter } from "next/navigation"
import Link from "next/link"

// ✅ Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// ✅ Fix Leaflet icon paths
import L from 'leaflet'

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Dynamic imports with loading states
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading map...</p>
        </div>
      </div>
    )
  }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
)

interface Sector {
  name: string
  center: [number, number]
  zoom: number
}

const SECTOR_VIEWS: Record<string, Sector> = {
  molo_district: { name: "Molo District", center: [10.6953, 122.5447], zoom: 14 },
  san_juan: { name: "San Juan, Molo", center: [10.688934672295565, 122.54406972520161], zoom: 18 },
  calumpang: { name: "Calumpang, Molo", center: [10.684981527314973, 122.53764295728061], zoom: 17 },
  south_fundidor: { name: "South Fundidor, Molo", center: [10.690069890430216, 122.53190738825322], zoom: 18 },
}

// ✅ Fixed MapUpdater with proper error handling
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  
  useEffect(() => {
    if (map) {
      try {
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 })
      } catch (error) {
        console.warn('Map not ready for flyTo:', error)
      }
    }
  }, [center, zoom, map])
  
  return null
}

function ReportDetailPanel({ report, onClose }: { report: any; onClose: () => void }) {
  const { t } = useLanguage()
  const router = useRouter()

  if (!report) return null

  const imageUrl = (() => {
    const img = report.processedImage || report.imageUri
    if (!img) return null
    if (img.startsWith("http") || img.startsWith("data:")) return img
    return `data:image/jpeg;base64,${img}`
  })()

  const statusConfig = (() => {
    switch (report.status?.toLowerCase()) {
      case 'critical': return { color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', label: t('critical') }
      case 'verified': return { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', label: t('verified') }
      default: return { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', label: t('pending') }
    }
  })()

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-white z-[500] shadow-2xl shadow-black/10 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="relative h-48 bg-slate-900 shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {report.verified && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
              <ShieldCheck size={10} /> Verified
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-white font-bold text-lg leading-tight mb-1">{report.locationName || 'Unknown Location'}</h2>
          <div className="flex items-center gap-3 text-white/60 text-xs">
            <span className="flex items-center gap-1"><User size={12} /> {report.userName || 'Unknown'}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <p className="text-lg font-bold text-slate-900">{report.accuracy || 0}%</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Confidence</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <p className="text-lg font-bold text-slate-900">{report.detections?.length || 0}</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Detections</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <p className={`text-lg font-bold ${statusConfig.text}`}>{report.status || '—'}</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Status</p>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 pb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{report.description || t('noDescription')}</p>
        </div>

        {/* AI Analysis */}
        <div className="px-4 pb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Bot size={12} /> AI Analysis
          </h3>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600 italic leading-relaxed">&quot;{report.reasoning || t('analysisPending')}&quot;</p>
          </div>
        </div>

        {/* Location */}
        <div className="px-4 pb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <MapPin size={12} /> Coordinates
          </h3>
          <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-500 text-center">
            {report.lat?.toFixed(6) || '0.000000'}, {report.lng?.toFixed(6) || '0.000000'}
          </div>
        </div>

        {/* Detections */}
        {report.detections && report.detections.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detections</h3>
            <div className="flex flex-wrap gap-1.5">
              {report.detections.map((d: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <Link
          href={`/reports/${report._id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all active:scale-[0.98]"
        >
          View Full Report
          <ArrowRight size={14} />
        </Link>
        <button
          onClick={() => router.push(`/assignments?reportId=${report._id}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all active:scale-[0.98]"
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
  const [isMapReady, setIsMapReady] = useState(false)

  const { user } = useAuth()
  const { t } = useLanguage()
  const allReports = useQuery(api.reports.getAllReports)

  const verifiedHotspots = allReports?.filter(r =>
    r.verified && r.status !== "Completed"
  ) || []

  const selectedReport = verifiedHotspots.find(r => r._id === selectedReportId) || null

  useEffect(() => {
    if (user?.role === 'brgy-calumpang') setCurrentView(SECTOR_VIEWS.calumpang)
    if (user?.role === 'brgy-sanjuan') setCurrentView(SECTOR_VIEWS.san_juan)
    if (user?.role === 'brgy-southfundidor') setCurrentView(SECTOR_VIEWS.south_fundidor)
  }, [user?.role])

  // ✅ Reset map ready state when component unmounts
  useEffect(() => {
    return () => {
      setIsMapReady(false)
    }
  }, [])

  return (
    <>
      {showSim && (
        <SimulationField
          onClose={() => setShowSim(false)}
          reports={(allReports ?? []).map((r: any) => ({
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

      <div className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9rem)] w-full relative overflow-hidden animate-fade-in rounded-2xl flex">
        <div className="flex-1 relative">
          {/* ✅ Use key prop to force remount when sector changes */}
          <MapContainer
            key={`map-${currentView.center[0]}-${currentView.center[1]}`}
            center={currentView.center}
            zoom={currentView.zoom}
            className="w-full h-full z-0"
            zoomControl={false}
            whenReady={() => setIsMapReady(true)}
          >
            {mapType === "street" ? (
              <TileLayer
                attribution='&copy; Stadia Maps'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              />
            ) : (
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {/* ✅ Only render MapUpdater when map is ready */}
            {isMapReady && (
              <MapUpdater center={currentView.center} zoom={currentView.zoom} />
            )}

            {verifiedHotspots.map((report) => (
              <CircleMarker
                key={report._id}
                center={[report.lat, report.lng] as [number, number]}
                radius={9}
                pathOptions={{
                  color: "white",
                  fillColor: report.status === 'CRITICAL' ? '#ef4444' : '#fbbf24',
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{ click: () => setSelectedReportId(report._id) }}
                className="cursor-pointer"
              >
                <CircleMarker
                  center={[report.lat, report.lng] as [number, number]}
                  radius={20}
                  pathOptions={{
                    color: "none",
                    fillColor: report.status === 'CRITICAL' ? '#ef4444' : '#fbbf24',
                    fillOpacity: 0.2,
                  }}
                />
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex items-start justify-between pointer-events-none">
            {/* Title */}
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl p-3 border border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900">{t('liveRiskMap')}</h2>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{verifiedHotspots.length} verified hotspots</p>
            </div>

            {/* Simulation button */}
            <button
              onClick={() => setShowSim(true)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-95"
            >
              <FlaskConical size={14} />
              <span className="text-[11px] font-semibold">{t('enterSimulation')}</span>
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-4 z-[400] flex items-end gap-3 pointer-events-none">
            {/* Map type */}
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/60 flex gap-0.5">
              <button onClick={() => setMapType("satellite")} className={`px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg transition-all flex items-center gap-1 ${mapType === "satellite" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                <Layers size={11} /> {t('satellite')}
              </button>
              <button onClick={() => setMapType("street")} className={`px-3 py-1.5 font-semibold text-[10px] uppercase rounded-lg transition-all ${mapType === "street" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {t('street')}
              </button>
            </div>

            {/* Sector selector */}
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/60 overflow-hidden relative">
              <select
                className="bg-transparent pl-3 pr-8 py-2 text-[10px] font-semibold text-slate-700 appearance-none cursor-pointer focus:outline-none"
                onChange={(e) => {
                  setCurrentView(SECTOR_VIEWS[e.target.value])
                  setIsMapReady(false) // Reset map ready state
                }}
                value={Object.keys(SECTOR_VIEWS).find(key => SECTOR_VIEWS[key] === currentView) || 'molo_district'}
              >
                {Object.entries(SECTOR_VIEWS).map(([key, sector]) => (
                  <option key={key} value={key}>{sector.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
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