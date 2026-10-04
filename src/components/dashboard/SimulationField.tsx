'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import dynamic from 'next/dynamic'
import L, { LatLngTuple } from "leaflet"
import {
  X, Wind, Droplets, Thermometer,
  Bell, Layers, Play, Pause, RotateCcw, Loader2,
  Bug, MapPin, Activity, Users, ShieldAlert,
  Zap, AlertTriangle, FlaskConical,
  ChevronRight, ExternalLink, BookOpen, AlertCircle,
  Compass, CloudRain, CheckCircle2, Navigation,
  Square, CheckSquare, MousePointer, Target, Search,
  Filter, Check, Crosshair, ArrowRight, TrendingUp
} from "lucide-react"

// Dynamic Leaflet components with SSR disabled
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Rectangle = dynamic(() => import('react-leaflet').then(mod => mod.Rectangle), { ssr: false })

// Base interfaces matching the Python server models
export interface SimReport {
  _id: string
  lat: number
  lng: number
  locationName: string
  status: string
  verified?: boolean
  accuracy?: number | string
  resolvedAt?: number | null
}

export interface WeatherData {
  temp_c: number
  humidity: number
  wind_kph: number
  wind_direction_deg: number
  precipitation_mm: number
  condition: string
  date: string
}

export interface AgentPosition {
  id: number
  lat: number
  lng: number
  age_days: number
  source_report_id: string
}

export interface HotspotPrediction {
  lat: number
  lng: number
  risk_score: number
  risk_level: "CRITICAL" | "HIGH" | "MODERATE"
  agent_count: number
  inspection_radius_m: number
  source_report_ids: string[]
  location_estimate: string
  reasoning: string
}

export interface TimelineDay {
  day: number
  date: string
  total_agents: number
  immature_agents: number
  deaths: number
  emerged: number
  agent_positions: AgentPosition[]
  hotspot_predictions: HotspotPrediction[]
}

export interface SimulationResult {
  day: number
  model_version: string
  seed: number
  scope: string
  input_report_count: number
  excluded_report_count: number
  limitations: string[]
  references: { title: string; url: string }[]
  timeline: TimelineDay[]
  weather: WeatherData | null
  weather_sequence: WeatherData[]
  weather_location?: { lat: number; lng: number }
  weather_source: string
  forecast_start?: string
  total_agents: number
  immature_agents: number
  hotspot_predictions: HotspotPrediction[]
  risk_index: number
  summary: string
  generated_at: string
}

export type SimScopeMode = 'all_unresolved' | 'high_risk' | 'box_select' | 'manual_pick'

interface SimulationFieldProps {
  onClose: () => void
  reports: SimReport[]
}

interface TravelingMosq {
  id: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  color: string
  glow: string
  startTime: number
  duration: number
}

const CLOSED_STATUSES = new Set(['RESOLVED', 'COMPLETED', 'CLOSED', 'DISMISSED', 'REJECTED'])
const ABM_URL = (process.env.NEXT_PUBLIC_SIMULATION_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const ILOILO_CITY_CENTER: LatLngTuple = [10.6953, 122.5447] // Molo District, Iloilo City

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const north = (lat2 - lat1) * 111320
  const east = (lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
  return Math.hypot(north, east)
}

export function isValidIloiloCoord(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false
  if (lat === 0 && lng === 0) return false
  // Check within 25 km of Iloilo City surveillance center
  const dist = distanceMeters(lat, lng, ILOILO_CITY_CENTER[0], ILOILO_CITY_CENTER[1])
  return dist <= 25000
}

function parseAccuracy(raw: SimReport['accuracy']): number {
  if (raw === undefined || raw === null || raw === '') return 85
  const text = String(raw).trim().replace(/%$/, '')
  const val = parseFloat(text)
  if (isNaN(val) || !isFinite(val)) return 85
  if (val <= 1 && val > 0) return Math.min(100, Math.max(0, val * 100))
  return Math.min(100, Math.max(0, val))
}

function normalizeStatus(s: string): string {
  const u = (s || 'MODERATE').trim().toUpperCase()
  const valid = [
    'CRITICAL', 'HIGH', 'MODERATE', 'MEDIUM', 'LOW', 'SAFE',
    'OPEN', 'PENDING', 'VERIFIED', 'UNVERIFIED', 'IN PROGRESS', 'ASSIGNED',
    'RESOLVED', 'COMPLETED', 'CLOSED', 'DISMISSED', 'REJECTED'
  ]
  return valid.includes(u) ? u : 'MODERATE'
}

function riskColor(level: string) {
  const l = (level || '').toUpperCase()
  if (l === "CRITICAL") return "#ef4444"
  if (l === "HIGH") return "#f97316"
  return "#fbbf24"
}

function riskGlow(level: string) {
  const l = (level || '').toUpperCase()
  if (l === "CRITICAL") return "rgba(239,68,68,0.6)"
  if (l === "HIGH") return "rgba(249,115,22,0.6)"
  return "rgba(251,191,36,0.6)"
}

function riskBg(level: string) {
  const l = (level || '').toUpperCase()
  if (l === "CRITICAL") return "bg-rose-500/15 text-rose-300 border-rose-500/30"
  if (l === "HIGH") return "bg-orange-500/15 text-orange-300 border-orange-500/30"
  return "bg-amber-500/15 text-amber-300 border-amber-500/30"
}

function getSimPinIcon(status?: string, verified?: boolean, isSelected?: boolean) {
  const s = status?.toUpperCase()
  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (s === 'CRITICAL' || s === 'HIGH') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (s === 'MODERATE' || s === 'MEDIUM' || !verified) {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = isSelected ? 40 : 32
  const selectedBorder = isSelected
    ? `<div class="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75" style="transform: scale(1.3);"></div>
       <div class="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border border-white flex items-center justify-center text-[9px] font-black text-white shadow-md">✓</div>`
    : ''

  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      ${selectedBorder}
      <img
        src="${iconUrl}"
        alt="Pin"
        class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom ${isSelected ? 'scale-115' : 'group-hover:scale-125'} select-none pointer-events-none"
        style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4));"
      />
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size],
  })
}

function makeHotspotPinIcon(level: string) {
  let iconUrl = '/assets/images/pin_safe.png'
  const l = (level || '').toUpperCase()
  if (l === 'CRITICAL') {
    iconUrl = '/assets/images/pin_critical.png'
  } else if (l === 'HIGH' || l === 'MODERATE') {
    iconUrl = '/assets/images/pin_moderate.png'
  }

  const s = 38
  const glow = riskGlow(level)
  const html = `
  <div style="position:relative;width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;">
    <div class="mosq-pulse-ring" style="position:absolute;inset:0;border-radius:50%;background:${glow};opacity:0.6;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <img src="${iconUrl}" alt="${level}" style="width:${s}px;height:${s}px;object-fit:contain;filter:drop-shadow(0 0 8px ${glow});position:relative;z-index:2;" />
  </div>`
  return L.divIcon({
    html,
    className: "custom-map-pin",
    iconSize: [s, s],
    iconAnchor: [s / 2, s - 4],
    popupAnchor: [0, -s]
  })
}

// Interactive Leaflet Box Drag Selection Controller
function MapBoxSelectController({
  active,
  onBoxSelected,
}: {
  active: boolean
  onBoxSelected: (bounds: L.LatLngBounds) => void
}) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null)
  const [currentPoint, setCurrentPoint] = useState<L.LatLng | null>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => {
    if (!active) {
      setStartPoint(null)
      setCurrentPoint(null)
      isDrawingRef.current = false
      try { map.dragging.enable() } catch { }
      return
    }

    try { map.dragging.disable() } catch { }

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      isDrawingRef.current = true
      setStartPoint(e.latlng)
      setCurrentPoint(e.latlng)
    }

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current || !startPoint) return
      setCurrentPoint(e.latlng)
    }

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current || !startPoint) return
      isDrawingRef.current = false
      const endPoint = e.latlng
      const bounds = L.latLngBounds(startPoint, endPoint)
      setStartPoint(null)
      setCurrentPoint(null)
      try { map.dragging.enable() } catch { }
      onBoxSelected(bounds)
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)

    return () => {
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      try { map.dragging.enable() } catch { }
    }
  }, [active, map, onBoxSelected, startPoint])

  if (!active || !startPoint || !currentPoint) return null

  const liveBounds = L.latLngBounds(startPoint, currentPoint)
  return (
    <Rectangle
      bounds={liveBounds}
      pathOptions={{
        color: '#06b6d4',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#06b6d4',
        fillOpacity: 0.25,
      }}
    />
  )
}

// Particle Canvas animation layer for flying mosquitoes with flapping wings (Inside MapContainer)
function MosquitoFlightCanvasLayer({ travelers, onAllDone }: { travelers: TravelingMosq[]; onAllDone: () => void }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!travelers.length) return
    const canvas = canvasRef.current
    if (!canvas) return
    const container = map.getContainer()
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    const ctx = canvas.getContext("2d")!
    const toXY = (lat: number, lng: number) => {
      const p = map.latLngToContainerPoint([lat, lng])
      return { x: p.x, y: p.y }
    }

    function easeInOut(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    function frame() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      const now = performance.now()
      let allDone = true

      for (const t of travelers) {
        const elapsed = Math.max(0, now - t.startTime)
        const raw = Math.min(1, elapsed / t.duration)
        const prog = easeInOut(raw)
        if (raw < 1) allDone = false

        const from = toXY(t.fromLat, t.fromLng)
        const to = toXY(t.toLat, t.toLng)
        const cx = from.x + (to.x - from.x) * prog
        const cy = from.y + (to.y - from.y) * prog - Math.sin(prog * Math.PI) * 60

        const np = Math.min(1, prog + 0.02)
        const nx = from.x + (to.x - from.x) * easeInOut(np)
        const ny = from.y + (to.y - from.y) * easeInOut(np) - Math.sin(easeInOut(np) * Math.PI) * 60
        const angle = Math.atan2(ny - cy, nx - cx) + Math.PI / 2

        // Glowing particle flight trail
        for (let i = 10; i >= 1; i--) {
          const tp = Math.max(0, prog - (i / 10) * 0.08)
          const tx = from.x + (to.x - from.x) * easeInOut(tp)
          const ty = from.y + (to.y - from.y) * easeInOut(tp) - Math.sin(easeInOut(tp) * Math.PI) * 60
          ctx.beginPath()
          ctx.arc(tx, ty, 2.2 * (1 - i / 10), 0, Math.PI * 2)
          const alpha = Math.round((1 - i / 10) * 0x66).toString(16).padStart(2, "0")
          ctx.fillStyle = t.color + alpha
          ctx.fill()
        }

        // Full Mosquito Rendering with Animated Flapping Wings
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        ctx.shadowColor = t.glow
        ctx.shadowBlur = 12

        // Abdomen / Torso
        ctx.beginPath()
        ctx.ellipse(0, 5, 3.5, 9, 0, 0, Math.PI * 2)
        ctx.fillStyle = t.color
        ctx.fill()

        // Thorax & Head
        ctx.beginPath()
        ctx.arc(0, -5, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()

        // Proboscis
        ctx.beginPath()
        ctx.moveTo(0, -8)
        ctx.lineTo(0, -15)
        ctx.strokeStyle = t.color
        ctx.lineWidth = 1.4
        ctx.stroke()

        // Flapping Wings
        const flap = Math.sin(now * 0.045) * 0.45
        ctx.shadowBlur = 0
        ctx.globalAlpha = 0.75

        // Left Wing
        ctx.beginPath()
        ctx.ellipse(-8, -2, 8, 4, -flap, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fill()

        // Right Wing
        ctx.beginPath()
        ctx.ellipse(8, -2, 8, 4, flap, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fill()

        ctx.globalAlpha = 1
        ctx.restore()
      }

      if (allDone) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height)
        onAllDone()
        return
      }
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
    }
  }, [travelers, map, onAllDone])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 450, pointerEvents: "none", width: "100%", height: "100%" }}
    />
  )
}

function NotificationModal({
  hotspot,
  onClose,
  onSend
}: {
  hotspot: HotspotPrediction
  onClose: () => void
  onSend: () => void
}) {
  const msg = `DENGUE SPREAD ALERT - ${hotspot.location_estimate}

Dear Resident,

Our barangay health monitoring system has identified a ${hotspot.risk_level} RISK next potential spread sector near your location (Spread Risk Score: ${Math.round(hotspot.risk_score * 100)}%).

IMMEDIATE PREVENTIVE ACTION - 4S Strategy:
1. SEARCH and destroy mosquito breeding habitats (drums, tires, plant saucers).
2. SELF-PROTECTION (wear long sleeves and apply insect repellent).
3. SEEK early consultation for fever lasting 2+ days.
4. SAY NO to indiscriminate fogging unless outbreak is declared.

- Molo District Health & Vector Monitoring Command`

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in text-slate-100">
        <div className="p-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Bell size={18} className="text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Community Alert Broadcast</h3>
              <p className="text-[11px] text-slate-400">Targeting residents within 500m radius of spread hotspot</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase inline-flex items-center gap-2 ${riskBg(hotspot.risk_level)}`}>
            <ShieldAlert size={13} /> {hotspot.risk_level} Priority — {hotspot.location_estimate}
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Broadcast Message Preview</p>
            <pre className="text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800/80 rounded-2xl p-4 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {msg}
            </pre>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSend(); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2"
            >
              <Bell size={14} /> Send Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SimulationField({ onClose, reports }: SimulationFieldProps) {
  const [days, setDays] = useState<number>(3)
  const [scope, setScope] = useState<SimScopeMode>('all_unresolved')
  const [mapType, setMapType] = useState<"street" | "satellite">("street")
  const [running, setRunning] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [runReports, setRunReports] = useState<SimReport[]>([])
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [playing, setPlaying] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<"playback" | "priorities" | "scientific">("playback")
  const [notifyTarget, setNotifyTarget] = useState<HotspotPrediction | null>(null)
  const [sentNotifs, setSentNotifs] = useState<Set<string>>(new Set())
  const [travelers, setTravelers] = useState<TravelingMosq[]>([])
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Custom Selection State (Single or Multiple / Box Area)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set())
  const [drawnBoxBounds, setDrawnBoxBounds] = useState<L.LatLngBounds | null>(null)
  const [isBoxSelectActive, setIsBoxSelectActive] = useState<boolean>(false)
  const [manualSearch, setManualSearch] = useState<string>('')

  const controllerRef = useRef<AbortController | null>(null)

  // 1. All valid candidate reports within Iloilo City perimeter
  const validIloiloReports = useMemo(() => {
    return (reports || []).filter(r => {
      const isClosed = CLOSED_STATUSES.has((r.status || '').trim().toUpperCase()) || r.resolvedAt != null
      if (isClosed) return false
      return isValidIloiloCoord(r.lat, r.lng)
    })
  }, [reports])

  const outlierCount = useMemo(() => {
    return (reports || []).filter(r => {
      const isClosed = CLOSED_STATUSES.has((r.status || '').trim().toUpperCase()) || r.resolvedAt != null
      if (isClosed) return false
      return !isValidIloiloCoord(r.lat, r.lng)
    }).length
  }, [reports])

  // 2. Compute effective selected reports based on active scope mode
  const selectedReports = useMemo(() => {
    if (scope === 'manual_pick') {
      if (selectedReportIds.size === 0) return []
      return validIloiloReports.filter(r => selectedReportIds.has(r._id))
    }

    if (scope === 'box_select') {
      if (!drawnBoxBounds) return []
      return validIloiloReports.filter(r => drawnBoxBounds.contains([r.lat, r.lng]))
    }

    if (scope === 'high_risk') {
      return validIloiloReports.filter(r => {
        const s = (r.status || '').trim().toUpperCase()
        return s === 'CRITICAL' || s === 'HIGH'
      })
    }

    // Default: 'all_unresolved'
    return validIloiloReports
  }, [scope, validIloiloReports, selectedReportIds, drawnBoxBounds])

  // Center calculation based on shown reports (guaranteed within Iloilo City)
  const shownReports = result ? runReports : selectedReports.length > 0 ? selectedReports : validIloiloReports
  const mapCenter: LatLngTuple = useMemo(() => {
    if (shownReports.length > 0) {
      const avgLat = shownReports.reduce((sum, r) => sum + r.lat, 0) / shownReports.length
      const avgLng = shownReports.reduce((sum, r) => sum + r.lng, 0) / shownReports.length
      if (isValidIloiloCoord(avgLat, avgLng)) {
        return [avgLat, avgLng]
      }
    }
    return ILOILO_CITY_CENTER
  }, [shownReports])

  // Current active frame in timeline
  const activeTimelineDay = useMemo(() => {
    if (!result?.timeline || result.timeline.length === 0) return null
    return result.timeline.find(d => d.day === selectedDay) || result.timeline[result.timeline.length - 1]
  }, [result, selectedDay])

  const activeWeather: WeatherData | null = useMemo(() => {
    if (!result?.weather_sequence || result.weather_sequence.length === 0) return result?.weather || null
    return result.weather_sequence[selectedDay - 1] || result.weather || null
  }, [result, selectedDay])

  const activeHotspots = activeTimelineDay?.hotspot_predictions ?? result?.hotspot_predictions ?? []
  const activeAgentPositions = activeTimelineDay?.agent_positions ?? []

  // Trigger Mosquito Flying Animation towards predicted locations
  const triggerMosquitoFlight = useCallback((hotspots: HotspotPrediction[], sources: SimReport[]) => {
    if (hotspots.length === 0 || sources.length === 0) return
    const now = performance.now()
    const newTravelers: TravelingMosq[] = hotspots.flatMap((hp, hi) => {
      const sortedSources = [...sources]
        .sort((a, b) => Math.hypot(a.lat - hp.lat, a.lng - hp.lng) - Math.hypot(b.lat - hp.lat, b.lng - hp.lng))
        .slice(0, 2)
      return sortedSources.map((src, si) => ({
        id: `t-${hi}-${si}-${now}`,
        fromLat: src.lat,
        fromLng: src.lng,
        toLat: hp.lat,
        toLng: hp.lng,
        color: riskColor(hp.risk_level),
        glow: riskGlow(hp.risk_level),
        startTime: now + hi * 300 + si * 120,
        duration: 1600 + Math.random() * 500,
      }))
    })
    setTravelers(newTravelers)
    setIsAnimating(true)
  }, [])

  // Playback timer
  useEffect(() => {
    if (!playing || !result || !result.timeline.length) return
    const timer = window.setInterval(() => {
      setSelectedDay(curr => {
        const next = curr >= result.day ? 1 : curr + 1
        return next
      })
    }, 1400)
    return () => window.clearInterval(timer)
  }, [playing, result])

  // Trigger flight animation on day change during playback or scrubber change
  useEffect(() => {
    if (!result) return
    const currentHotspots = activeHotspots.length > 0 ? activeHotspots : result.hotspot_predictions
    const currentSources = runReports.length > 0 ? runReports : selectedReports
    triggerMosquitoFlight(currentHotspots, currentSources)
  }, [selectedDay, result, activeHotspots, runReports, selectedReports, triggerMosquitoFlight])

  // Abort on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  // Handle Box Drag Selection Complete
  const handleBoxSelected = useCallback((bounds: L.LatLngBounds) => {
    setDrawnBoxBounds(bounds)
    setIsBoxSelectActive(false)
    setScope('box_select')
    reset()
  }, [])

  // Handle single report pick
  const handleSelectSingleReport = useCallback((reportId: string) => {
    setScope('manual_pick')
    setSelectedReportIds(new Set([reportId]))
    setDrawnBoxBounds(null)
    reset()
  }, [])

  // Handle toggle in manual multi-selection
  const handleToggleReportSelection = useCallback((reportId: string) => {
    setScope('manual_pick')
    setSelectedReportIds(prev => {
      const next = new Set(prev)
      if (next.has(reportId)) next.delete(reportId)
      else next.add(reportId)
      return next
    })
    setDrawnBoxBounds(null)
    reset()
  }, [])

  const runSimulation = useCallback(async () => {
    if (selectedReports.length === 0) {
      setError(
        scope === 'box_select'
          ? 'No reports found inside the drawn box area. Please drag a box over reported breeding sites.'
          : scope === 'manual_pick'
            ? 'No reports selected. Please pick at least 1 report from the list or map.'
            : 'No eligible unresolved reports found for the selected scope in Iloilo City.'
      )
      return
    }

    const requestController = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = requestController

    setRunning(true)
    setError('')
    setResult(null)
    setPlaying(false)
    setTravelers([])
    setIsAnimating(false)

    const timeout = window.setTimeout(() => requestController.abort(), 45000)

    try {
      const payload = {
        days: Number(days),
        scope: scope === 'high_risk' ? 'high_risk' : 'all_unresolved',
        seed: 42,
        reports: selectedReports.map(r => ({
          id: String(r._id),
          lat: Number(r.lat),
          lng: Number(r.lng),
          status: normalizeStatus(r.status),
          verified: Boolean(r.verified),
          accuracy: parseAccuracy(r.accuracy),
          resolved: false,
          resolved_at: r.resolvedAt ?? null,
          location_name: (r.locationName || 'Reported Site').slice(0, 180),
        }))
      }

      const response = await fetch(`${ABM_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: requestController.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : `Simulation error (${response.status}). Please verify report coordinates and connectivity.`
        )
      }

      if (!Array.isArray(data.timeline) || !Array.isArray(data.weather_sequence)) {
        throw new Error('Simulation API returned invalid payload structure. Please ensure the Python server is running version 2.0+.')
      }

      if (requestController.signal.aborted) return

      setResult(data)
      setRunReports(selectedReports)
      setSelectedDay(data.day)

      // Start initial flight animation
      triggerMosquitoFlight(data.hotspot_predictions || [], selectedReports)
    } catch (err: any) {
      if (controllerRef.current !== requestController) return
      setError(
        requestController.signal.aborted
          ? 'Simulation request timed out. Please check your internet connection or weather forecast API.'
          : err instanceof Error
            ? err.message
            : 'Simulation server unreachable. Ensure python simulation.py is active on port 5000.'
      )
    } finally {
      window.clearTimeout(timeout)
      if (controllerRef.current === requestController) {
        setRunning(false)
      }
    }
  }, [days, scope, selectedReports, triggerMosquitoFlight])

  const handleTravelDone = useCallback(() => {
    setTravelers([])
    setIsAnimating(false)
  }, [])

  const reset = () => {
    setResult(null)
    setPlaying(false)
    setError('')
    setTravelers([])
    setIsAnimating(false)
  }

  // Filter for manual picker list
  const filteredManualList = useMemo(() => {
    if (!manualSearch) return validIloiloReports
    const q = manualSearch.toLowerCase()
    return validIloiloReports.filter(r =>
      (r.locationName || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    )
  }, [validIloiloReports, manualSearch])

  return (
    <div className="fixed inset-0 z-[800] bg-slate-950 text-slate-100 flex flex-col animate-fade-in font-sans" role="dialog" aria-modal="true" aria-label="Mosquito inspection simulation">
      {/* ─── Top Header Bar ─── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Bug size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-white text-base tracking-tight leading-none">
                Mosquito Spread & Dispersal Simulation
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                Iloilo City Scope
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Predicting Next Potential Spread Locations & Vector Hotspots Under Forecast Weather
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {result && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold">
              <Activity size={13} className={result.risk_index >= 0.8 ? 'text-rose-400' : result.risk_index >= 0.5 ? 'text-orange-400' : 'text-amber-400'} />
              <span className="text-slate-400">Peak Spread Risk:</span>
              <span className={result.risk_index >= 0.8 ? 'text-rose-400 font-black' : result.risk_index >= 0.5 ? 'text-orange-400 font-black' : 'text-amber-400 font-black'}>
                {Math.round(result.risk_index * 100)}% ({activeHotspots.length} Next Hotspots)
              </span>
            </div>
          )}

          {isAnimating && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Simulating Dispersal Flight...</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <X size={15} /> Close
          </button>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* ─── Left Configuration & Controls Sidebar ─── */}
        <aside className="w-full md:w-84 lg:w-96 bg-slate-900/60 border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto p-5 space-y-5">
          {/* Scope Mode Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Habitat Selection Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => { setScope('all_unresolved'); setDrawnBoxBounds(null); reset(); }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${scope === 'all_unresolved' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Layers size={13} /> All Unresolved
              </button>
              <button
                onClick={() => { setScope('high_risk'); setDrawnBoxBounds(null); reset(); }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${scope === 'high_risk' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ShieldAlert size={13} /> High Risk Only
              </button>
              <button
                onClick={() => {
                  setScope('box_select');
                  setIsBoxSelectActive(true);
                  reset();
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${scope === 'box_select' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Square size={13} /> Box Drag Area
              </button>
              <button
                onClick={() => {
                  setScope('manual_pick');
                  if (selectedReportIds.size === 0 && validIloiloReports.length > 0) {
                    setSelectedReportIds(new Set([validIloiloReports[0]._id]))
                  }
                  reset();
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${scope === 'manual_pick' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Target size={13} /> Single / Pick
              </button>
            </div>

            {/* Scope Details / Active count badge */}
            <div className="mt-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <MapPin size={12} className="text-rose-400" />
                  Origin Habitats:
                </span>
                <span className="text-white font-black px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700">
                  {selectedReports.length} Site{selectedReports.length === 1 ? '' : 's'} Selected
                </span>
              </div>

              {scope === 'box_select' && (
                <div className="mt-2 text-[11px] text-cyan-300 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/40 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Square size={12} />
                    {isBoxSelectActive ? 'Click & Drag on Map to Draw Area' : drawnBoxBounds ? 'Box Area Defined' : 'No Box Drawn Yet'}
                  </p>
                  <button
                    onClick={() => setIsBoxSelectActive(true)}
                    className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all text-[10px] uppercase cursor-pointer"
                  >
                    {isBoxSelectActive ? 'Drawing in progress...' : drawnBoxBounds ? 'Redraw Selection Box' : 'Click to Draw Box on Map'}
                  </button>
                </div>
              )}

              {scope === 'manual_pick' && (
                <p className="mt-1 text-[10px] text-amber-300/90 leading-relaxed">
                  Select 1 or multiple specific breeding sites below, or click any pin on the map.
                </p>
              )}

              {outlierCount > 0 && (
                <p className="mt-1.5 text-[10px] text-amber-400/90 leading-relaxed border-t border-slate-700/50 pt-1.5">
                  ℹ️ {outlierCount} report(s) outside the 25km Iloilo City cluster excluded.
                </p>
              )}
            </div>
          </div>

          {/* Manual Site Selection Checklist (when manual_pick mode active) */}
          {scope === 'manual_pick' && (
            <div className="space-y-2 border border-slate-800 p-3 rounded-2xl bg-slate-950/70">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Pick Origin Sites</span>
                <div className="flex gap-2 text-[10px]">
                  <button
                    onClick={() => setSelectedReportIds(new Set(validIloiloReports.map(r => r._id)))}
                    className="text-cyan-400 hover:underline font-bold"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedReportIds(new Set())}
                    className="text-slate-400 hover:underline font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search location..."
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Scrollable list */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredManualList.map(r => {
                  const isChecked = selectedReportIds.has(r._id)
                  return (
                    <div
                      key={r._id}
                      onClick={() => handleToggleReportSelection(r._id)}
                      className={`p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer border transition-all ${isChecked ? 'bg-primary-950/40 border-primary-500/40 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-slate-200">{r.locationName || 'Breeding Site'}</p>
                        <p className="text-[9px] text-slate-500">{r.status} · {r.verified ? 'Verified' : 'Unverified'}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${isChecked ? 'bg-primary-600 border-primary-400 text-white' : 'border-slate-700 bg-slate-800'}`}>
                        {isChecked && <Check size={10} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Forecast Horizon Days Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Forecast Horizon
              </label>
              <span className="text-sm font-black text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                {days} Day{days === 1 ? '' : 's'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={14}
              value={days}
              disabled={running}
              onChange={e => { setDays(Number(e.target.value)); reset(); }}
              className="w-full accent-primary-500 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mt-1">
              <span>1 Day</span>
              <span>7 Days</span>
              <span>14 Days</span>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              {[1, 3, 5, 7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => { setDays(d); reset(); }}
                  disabled={running}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${days === d ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <div>
            <button
              onClick={runSimulation}
              disabled={running || selectedReports.length === 0}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-cyan-500 hover:from-primary-500 hover:to-cyan-400 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-600/25 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {running ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Predicting Next Spread Sectors...
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  Run {selectedReports.length === 1 ? 'Single-Site' : `${selectedReports.length}-Site`} Spread Model
                </>
              )}
            </button>
            {result && !running && (
              <button
                onClick={reset}
                className="w-full mt-2 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} /> Reset Simulation
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs space-y-1" role="alert">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                <span>Simulation Alert</span>
              </div>
              <p className="text-[11px] leading-relaxed">{error}</p>
            </div>
          )}

          {/* Daily Stepper / Playback Controls when result exists (Focused on Spread Progression, NO Raw Mosquito Counts) */}
          {result && (
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Activity size={14} className="text-cyan-400" />
                  Day {selectedDay} Progression
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {activeTimelineDay?.date}
                </span>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min={1}
                  max={result.day}
                  value={selectedDay}
                  onChange={e => { setPlaying(false); setSelectedDay(Number(e.target.value)); }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!playing && selectedDay >= result.day) setSelectedDay(1)
                    setPlaying(!playing)
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {playing ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                  {playing ? 'Pause Playback' : 'Play Spread Timeline'}
                </button>
                <button
                  onClick={() => setSelectedDay(1)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Restart from Day 1"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Spread Progression Telemetry (NO Raw Mosquito Counts) */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Predicted Next Locations</span>
                  <span className="text-base font-black text-white">{activeHotspots.length} Priority Sectors</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Day Spread Severity</span>
                  <span className={`text-xs font-black uppercase ${result.risk_index >= 0.8 ? 'text-rose-400' : result.risk_index >= 0.5 ? 'text-orange-400' : 'text-amber-400'}`}>
                    {result.risk_index >= 0.8 ? 'Critical Expansion' : result.risk_index >= 0.5 ? 'High Dispersal' : 'Moderate Drift'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Top Predicted Direction</span>
                  <span className="text-xs font-bold text-cyan-300 truncate block">
                    {activeHotspots[0]?.location_estimate || 'Surrounding Local Perimeter'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer text */}
          <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-3">
            <strong>Model Purpose:</strong> Evaluates environmental habitat suitability and wind-drift pathways to highlight the most probable next locations for vector expansion and preventive larviciding.
          </p>
        </aside>

        {/* ─── Center / Right Main Canvas & Analysis Tabs ─── */}
        <main className="flex-1 flex flex-col min-h-0 relative bg-slate-950">
          {/* Navigation Tabs + Map Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3 pb-2 bg-slate-900/80 border-b border-slate-800 shrink-0">
            <div className="flex gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("playback")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "playback" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Layers size={13} /> Next Locations Map
              </button>
              <button
                onClick={() => setActiveTab("priorities")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "priorities" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                <MapPin size={13} /> Predicted Hotspots ({activeHotspots.length})
              </button>
              <button
                onClick={() => setActiveTab("scientific")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "scientific" ? "bg-primary-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                <BookOpen size={13} /> Model Methodology
              </button>
            </div>

            {/* Quick Box Drag Action & Tiles Switcher */}
            {activeTab === "playback" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setScope('box_select');
                    setIsBoxSelectActive(!isBoxSelectActive);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${isBoxSelectActive ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse font-black' : drawnBoxBounds ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60' : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'}`}
                  title="Click and drag on the map to select a custom bounding area"
                >
                  <Square size={13} />
                  {isBoxSelectActive ? 'Drag on Map Now' : drawnBoxBounds ? 'Area Box Active' : 'Drag Box Tool'}
                </button>

                <div className="flex gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    onClick={() => setMapType("street")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${mapType === "street" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Dark Street
                  </button>
                  <button
                    onClick={() => setMapType("satellite")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${mapType === "satellite" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Satellite
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── TAB 1: Live Map View ─── */}
          {activeTab === "playback" && (
            <div className="flex-1 relative min-h-[300px] overflow-hidden">
              <MapContainer
                key={`${mapCenter[0].toFixed(4)}-${mapCenter[1].toFixed(4)}`}
                center={mapCenter}
                zoom={15}
                className="h-full w-full"
                zoomControl={false}
              >
                {mapType === "street" ? (
                  <TileLayer
                    attribution='&copy; Stadia Maps &copy; OpenStreetMap'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                )}

                {/* Interactive Box Drag Selection Component (INSIDE MapContainer) */}
                <MapBoxSelectController
                  active={isBoxSelectActive}
                  onBoxSelected={handleBoxSelected}
                />

                {/* Render Defined Selection Box if present */}
                {drawnBoxBounds && (
                  <Rectangle
                    bounds={drawnBoxBounds}
                    pathOptions={{
                      color: '#06b6d4',
                      weight: 2,
                      dashArray: '5, 5',
                      fillColor: '#06b6d4',
                      fillOpacity: 0.15,
                    }}
                  />
                )}

                {/* 1. Unresolved Report Source Markers */}
                {validIloiloReports.map(r => {
                  const isSelected = selectedReports.some(sr => sr._id === r._id)
                  return (
                    <Marker
                      key={r._id}
                      position={[r.lat, r.lng] as LatLngTuple}
                      icon={getSimPinIcon(r.status, r.verified, isSelected)}
                    >
                      <Popup>
                        <div className="w-56 bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{r.locationName || 'Reported Habitat'}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${riskBg(r.status)}`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300">
                            {r.verified ? 'Verified Breeding Site' : 'Community Reported Site'} · {parseAccuracy(r.accuracy)}% AI Confidence
                          </p>

                          {/* Quick Actions in Popup */}
                          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                            <button
                              onClick={() => handleSelectSingleReport(r._id)}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Target size={11} /> Simulate Only This Site
                            </button>
                            <button
                              onClick={() => handleToggleReportSelection(r._id)}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {selectedReportIds.has(r._id) ? 'Remove from Selection' : '+ Add to Simulation Selection'}
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

                {/* 2. Predicted Next Hotspot Locations (100m radius priority circles) */}
                {activeHotspots.map((hp, idx) => (
                  <React.Fragment key={`hp-${idx}-${hp.lat}-${hp.lng}`}>
                    <Circle
                      center={[hp.lat, hp.lng]}
                      radius={hp.inspection_radius_m || 100}
                      pathOptions={{
                        color: riskColor(hp.risk_level),
                        fillColor: riskColor(hp.risk_level),
                        fillOpacity: 0.16,
                        weight: 2,
                        dashArray: "4, 6"
                      }}
                    >
                      <Popup>
                        <div className="w-60 bg-slate-900 text-white rounded-xl p-3.5 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{hp.location_estimate}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${riskBg(hp.risk_level)}`}>
                              {hp.risk_level}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">{hp.reasoning}</p>
                          <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                            <span>Spread Risk: {Math.round(hp.risk_score * 100)}%</span>
                            <span>100m Perimeter</span>
                          </div>
                        </div>
                      </Popup>
                    </Circle>

                    <Marker
                      position={[hp.lat, hp.lng]}
                      icon={makeHotspotPinIcon(hp.risk_level)}
                    >
                      <Popup>
                        <div className="w-56 bg-slate-900 text-white rounded-xl p-3 border border-slate-800">
                          <p className="font-bold text-xs">{hp.location_estimate}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{hp.reasoning}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}

                {/* 3. Dispersal Vector Paths on Map */}
                {activeAgentPositions.map(agent => (
                  <CircleMarker
                    key={`ag-${agent.id}`}
                    center={[agent.lat, agent.lng]}
                    radius={3}
                    pathOptions={{
                      color: '#a855f7',
                      fillColor: '#c084fc',
                      fillOpacity: 0.85,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs p-1">
                        <strong>Projected Dispersion Vector</strong>
                        <p className="text-[10px] text-slate-600">Active migration pathway from origin habitat</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Animated Flying Mosquito Animation (WITH FLAPPING WINGS & GLOW TRAILS) */}
                {travelers.length > 0 && (
                  <MosquitoFlightCanvasLayer travelers={travelers} onAllDone={handleTravelDone} />
                )}
              </MapContainer>

              {/* Weather Telemetry Floating Card */}
              {activeWeather && (
                <div className="absolute top-4 left-4 z-[500] bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800/80 shadow-2xl text-xs space-y-2 max-w-[240px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CloudRain size={13} className="text-cyan-400" />
                      Day {selectedDay} Weather
                    </span>
                    <span className="text-[9px] text-slate-400">{activeWeather.date}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Thermometer size={13} className="text-orange-400" />
                      <span>{activeWeather.temp_c}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Droplets size={13} className="text-blue-400" />
                      <span>{activeWeather.humidity}% RH</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Wind size={13} className="text-cyan-400" />
                      <span>{activeWeather.wind_kph} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Compass size={13} className="text-amber-400" />
                      <span>{activeWeather.wind_direction_deg}° Dir</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Rain: {activeWeather.precipitation_mm} mm</span>
                    <span className="text-cyan-400 font-semibold">{result?.weather_source || 'Open-Meteo'}</span>
                  </div>
                </div>
              )}

              {/* Map Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-[500] bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800/80 text-[10px] space-y-1.5 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">Origin Breeding Habitat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-slate-300">Projected Vector Spread Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" />
                  <span className="text-slate-300">Next Predicted Hotspot (100m Radius)</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: Predicted Hotspots & Priorities ─── */}
          {activeTab === "priorities" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Next Predicted Spread Hotspots</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Day {selectedDay} high-probability expansion sectors determined by wind vector drift and habitat conditions
                  </p>
                </div>
                {result && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                    {activeHotspots.length} Priority Sectors
                  </span>
                )}
              </div>

              {activeHotspots.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400 space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-slate-200">No Significant Spread Clusters for Day {selectedDay}</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Weather conditions indicate low vector dispersal. Continue preventive source reduction at origin sites.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeHotspots.map((hp, idx) => (
                    <div
                      key={`hp-card-${idx}`}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h3 className="text-sm font-bold text-white">{hp.location_estimate}</h3>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">
                            Coordinates: {hp.lat.toFixed(5)}, {hp.lng.toFixed(5)} · 100m Perimeter
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${riskBg(hp.risk_level)}`}>
                          {hp.risk_level} · {Math.round(hp.risk_score * 100)}% Risk
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                        {hp.reasoning}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${hp.lat},${hp.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Navigation size={13} /> Open in Maps
                        </a>
                        <button
                          onClick={() => setNotifyTarget(hp)}
                          disabled={sentNotifs.has(hp.location_estimate)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${sentNotifs.has(hp.location_estimate)
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-primary-600 hover:bg-primary-500 text-white shadow-md'}`}
                        >
                          {sentNotifs.has(hp.location_estimate) ? (
                            <>
                              <CheckCircle2 size={13} /> Alert Sent
                            </>
                          ) : (
                            <>
                              <Bell size={13} /> Notify Residents
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: Model Methodology ─── */}
          {activeTab === "scientific" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-5 max-w-4xl">
              <div>
                <h2 className="text-lg font-bold text-white">Dispersal & Next-Location Model Methodology</h2>
                <p className="text-xs text-slate-400 mt-1">
                  How the Agent-Based Model tracks vector spread trajectories under wind and temperature dynamics.
                </p>
              </div>

              {/* Summary */}
              {result?.summary && (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-100 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-cyan-400">
                    <Activity size={14} /> Scenario Projection Summary
                  </div>
                  <p>{result.summary}</p>
                </div>
              )}

              {/* Methodological Assumptions */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  Model Mechanics & Assumptions
                </h3>
                <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4 leading-relaxed">
                  <li><strong>Next Spread Prediction:</strong> Simulated agents serve as dispersal vectors to forecast which surrounding sectors are at highest risk of mosquito migration.</li>
                  <li><strong>Wind-Drift Trajectory:</strong> Downwind flight bias is computed from Open-Meteo hourly speed and circular wind vectors.</li>
                  <li><strong>Temperature & Moisture Response:</strong> Thermal suitability and survival curves are applied to identify prime habitat accumulation zones.</li>
                  <li><strong>Local Action:</strong> Scores guide proactive inspection and container treatment within the highlighted 100-meter radius.</li>
                </ul>
              </div>

              {/* Citations & References */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} className="text-primary-400" />
                  Primary Literature & Technical References
                </h3>
                <div className="space-y-2.5">
                  {(result?.references || [
                    { title: "CDC: Life Cycle and Dispersal of Aedes Mosquitoes", url: "https://www.cdc.gov/mosquitoes/about/life-cycle-of-aedes-mosquitoes.html" },
                    { title: "Brady et al. (2013): Temperature-Dependent Adult Survival", url: "https://doi.org/10.1186/1756-3305-6-351" },
                    { title: "Mark-release-recapture of male Aedes aegypti (2021)", url: "https://doi.org/10.1371/journal.pntd.0009357" },
                    { title: "Open-Meteo API Documentation", url: "https://open-meteo.com/en/docs" }
                  ]).map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 text-xs text-slate-200 transition-all group"
                    >
                      <span className="font-semibold group-hover:text-cyan-300 transition-colors">{ref.title}</span>
                      <ExternalLink size={13} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── Push Notification Modal ─── */}
      {notifyTarget && (
        <NotificationModal
          hotspot={notifyTarget}
          onClose={() => setNotifyTarget(null)}
          onSend={() => setSentNotifs(prev => new Set(prev).add(notifyTarget.location_estimate))}
        />
      )}
    </div>
  )
}
