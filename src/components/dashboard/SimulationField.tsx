'use client'

import React, { useState, useEffect, useRef, useCallback } from "react"
import dynamic from 'next/dynamic'
import L, { LatLngTuple, DivIcon } from "leaflet"
import {
  X, Wind, Droplets, Thermometer,
  Bell, Layers, Play, RotateCcw, Loader2,
  Bug, MapPin, Activity, Users, ShieldAlert,
  Zap, TrendingUp, AlertTriangle, FlaskConical,
  ChevronRight, ArrowRight
} from "lucide-react"

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface SimReport {
  _id: string
  lat: number
  lng: number
  locationName: string
  status: "CRITICAL" | "HIGH" | "MODERATE"
  verified: boolean
  accuracy?: number
  userId?: string
  userName?: string
  description?: string
  detections?: string
  reasoning?: string
  imageUri?: string
}

interface HotspotPrediction {
  lat: number
  lng: number
  risk_score: number
  risk_level: "CRITICAL" | "HIGH" | "MODERATE"
  agent_count: number
  reasoning: string
  location_estimate: string
}

interface SimulationResult {
  day: number
  weather: { temp_c: number; humidity: number; wind_kph: number; condition: string }
  total_agents: number
  hotspot_predictions: HotspotPrediction[]
  summary: string
  risk_index: number
  movement_analysis?: {
    pattern: string
    dispersal_speed_km_day: number
    max_range_km: number
    concentration_ratio: number
    highest_density_location: string
    secondary_spread: boolean
  }
  ai_insights?: string
}

interface SimulationFieldProps {
  onClose: () => void
  reports: SimReport[]
}

interface TravelingMosq {
  id: string
  fromLat: number; fromLng: number
  toLat: number;   toLng: number
  color: string;   glow: string
  startTime: number
  duration: number
}

function riskColor(level: string) {
  if (level === "CRITICAL") return "#ef4444"
  if (level === "HIGH")     return "#f97316"
  return "#fbbf24"
}
function riskGlow(level: string) {
  if (level === "CRITICAL") return "rgba(239,68,68,0.6)"
  if (level === "HIGH")     return "rgba(249,115,22,0.6)"
  return "rgba(251,191,36,0.6)"
}
function riskBg(level: string) {
  if (level === "CRITICAL") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
  if (level === "HIGH")     return "bg-orange-500/10 text-orange-400 border-orange-500/20"
  return "bg-amber-500/10 text-amber-400 border-amber-500/20"
}
function riskLabel(level: string) {
  if (level === "CRITICAL") return "bg-rose-500"
  if (level === "HIGH")     return "bg-orange-500"
  return "bg-amber-500"
}
function easeInOut(t: number) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
}

function makeMosqIcon(color: string, glowColor: string): DivIcon {
  const s = 44
  const html = `
  <div style="position:relative;width:${s}px;height:${s}px;pointer-events:none;">
    <div class="mosq-pulse-ring" style="background:${glowColor};animation-delay:0s;"></div>
    <div class="mosq-pulse-ring" style="background:${glowColor};animation-delay:0.6s;"></div>
    <svg class="mosq-icon-svg" width="${s}" height="${s}" viewBox="0 0 64 64"
         xmlns="http://www.w3.org/2000/svg"
         style="filter:drop-shadow(0 0 7px ${glowColor});">
      <ellipse cx="32" cy="37" rx="5.5" ry="13" fill="${color}"/>
      <ellipse cx="32" cy="24" rx="4.5" ry="5.5" fill="${color}"/>
      <circle cx="32" cy="17" r="4.5" fill="${color}"/>
      <path d="M32 21 Q31 14 32 9" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M30 14 Q25 7 22 4"  stroke="${color}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M34 14 Q39 7 42 4"  stroke="${color}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <ellipse cx="18" cy="27" rx="13" ry="5.5" fill="rgba(255,255,255,0.5)"
               stroke="${color}" stroke-width="0.8"
               style="animation:mosq-wings-l 0.15s linear infinite alternate;transform-origin:31px 27px;"/>
      <ellipse cx="46" cy="27" rx="13" ry="5.5" fill="rgba(255,255,255,0.5)"
               stroke="${color}" stroke-width="0.8"
               style="animation:mosq-wings-r 0.15s linear infinite alternate-reverse;transform-origin:33px 27px;"/>
      <g stroke="${color}" stroke-width="1.1" stroke-linecap="round" opacity="0.7">
        <line x1="27" y1="32" x2="14" y2="38"/><line x1="14" y1="38" x2="10" y2="43"/>
        <line x1="27" y1="37" x2="13" y2="44"/><line x1="13" y1="44" x2="9"  y2="50"/>
        <line x1="27" y1="42" x2="15" y2="50"/><line x1="15" y1="50" x2="11" y2="56"/>
        <line x1="37" y1="32" x2="50" y2="38"/><line x1="50" y1="38" x2="54" y2="43"/>
        <line x1="37" y1="37" x2="51" y2="44"/><line x1="51" y1="44" x2="55" y2="50"/>
        <line x1="37" y1="42" x2="49" y2="50"/><line x1="49" y1="50" x2="53" y2="56"/>
      </g>
      <g opacity="0.25">
        <ellipse cx="32" cy="34" rx="4.5" ry="1.2" fill="white"/>
        <ellipse cx="32" cy="39" rx="4"   ry="1.2" fill="white"/>
        <ellipse cx="32" cy="44" rx="3.5" ry="1"   fill="white"/>
      </g>
    </svg>
  </div>`
  return L.divIcon({ html, className: "", iconSize: [s, s], iconAnchor: [s/2, s/2], popupAnchor: [0, -s/2] })
}

function TravelLayer({ travelers, onAllDone }: { travelers: TravelingMosq[]; onAllDone: () => void }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    if (!travelers.length) return
    const canvas = canvasRef.current
    if (!canvas) return
    const container = map.getContainer()
    canvas.width  = container.clientWidth
    canvas.height = container.clientHeight
    const ctx = canvas.getContext("2d")!
    const toXY = (lat: number, lng: number) => {
      const p = map.latLngToContainerPoint([lat, lng])
      return { x: p.x, y: p.y }
    }
    function frame() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      const now = performance.now()
      let allDone = true
      for (const t of travelers) {
        const elapsed = Math.max(0, now - t.startTime)
        const raw     = Math.min(1, elapsed / t.duration)
        const prog    = easeInOut(raw)
        if (raw < 1) allDone = false
        const from = toXY(t.fromLat, t.fromLng)
        const to   = toXY(t.toLat,   t.toLng)
        const cx = from.x + (to.x - from.x) * prog
        const cy = from.y + (to.y - from.y) * prog - Math.sin(prog * Math.PI) * 65
        const np   = Math.min(1, prog + 0.02)
        const nx   = from.x + (to.x - from.x) * easeInOut(np)
        const ny   = from.y + (to.y - from.y) * easeInOut(np) - Math.sin(easeInOut(np) * Math.PI) * 65
        const angle = Math.atan2(ny - cy, nx - cx) + Math.PI / 2
        for (let i = 10; i >= 1; i--) {
          const tp = Math.max(0, prog - (i / 10) * 0.1)
          const tx = from.x + (to.x - from.x) * easeInOut(tp)
          const ty = from.y + (to.y - from.y) * easeInOut(tp) - Math.sin(easeInOut(tp) * Math.PI) * 65
          ctx.beginPath()
          ctx.arc(tx, ty, 2.2 * (1 - i/10), 0, Math.PI*2)
          const alpha = Math.round((1 - i/10) * 0x44).toString(16).padStart(2,"0")
          ctx.fillStyle = t.color + alpha
          ctx.fill()
        }
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        ctx.shadowColor = t.glow
        ctx.shadowBlur  = 12
        ctx.beginPath()
        ctx.ellipse(0, 5, 3.5, 10, 0, 0, Math.PI*2)
        ctx.fillStyle = t.color
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, -7, 3.5, 0, Math.PI*2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(0, -10)
        ctx.lineTo(0, -17)
        ctx.strokeStyle = t.color
        ctx.lineWidth = 1.2
        ctx.stroke()
        const flap = Math.sin(now * 0.045) * 0.35
        ctx.shadowBlur = 0
        ctx.globalAlpha = 0.55
        ctx.beginPath()
        ctx.ellipse(-9, -1, 9, 4.5, -flap, 0, Math.PI*2)
        ctx.fillStyle = "rgba(255,255,255,0.75)"
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(9, -1, 9, 4.5, flap, 0, Math.PI*2)
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
    <canvas ref={canvasRef}
      style={{ position:"absolute", top:0, left:0, zIndex:450, pointerEvents:"none", width:"100%", height:"100%" }} />
  )
}

function MapScene({ reports, mapType, visibleHotspots, travelers, onTravelDone }:
  { reports: SimReport[]; mapType: "street"|"satellite"; visibleHotspots: HotspotPrediction[];
    travelers: TravelingMosq[]; onTravelDone: () => void }) {
  return (
    <>
      {mapType === "street"
        ? <TileLayer attribution="&copy; Stadia Maps" url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"/>
        : <TileLayer attribution="&copy; Esri"        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/>
      }
      {reports.map((rpt) => (
        <CircleMarker key={rpt._id}
          center={[rpt.lat, rpt.lng] as LatLngTuple} radius={6}
          pathOptions={{ color:"white", fillColor: rpt.verified ? "#10b981" : "#6b7280", fillOpacity:0.9, weight:1.5 }}>
          <Popup>
            <div className="w-48 bg-white rounded-xl overflow-hidden shadow-xl border border-slate-100">
              <div className="bg-slate-900 px-3 py-2">
                <p className="font-bold text-xs text-white">{rpt.locationName || "Unknown Location"}</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">Status</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    rpt.status === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                    rpt.status === "HIGH" ? "bg-orange-100 text-orange-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{rpt.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">Verified</span>
                  <span className="text-[9px] font-bold text-slate-700">{rpt.verified ? "Yes" : "No"}</span>
                </div>
                {rpt.accuracy && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Accuracy</span>
                    <span className="text-[9px] font-bold text-slate-700">{Math.round(rpt.accuracy * 100)}%</span>
                  </div>
                )}
                {rpt.userName && (
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400">Reporter: </span>
                    <span className="text-[9px] text-slate-600">{rpt.userName}</span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {visibleHotspots.map((hp, i) => (
        <React.Fragment key={i}>
          <CircleMarker
            center={[hp.lat, hp.lng] as LatLngTuple} radius={40}
            pathOptions={{ color: riskColor(hp.risk_level), fillColor: riskColor(hp.risk_level), fillOpacity:0.07, weight:1, dashArray:"5 5" }}
          />
          <Marker position={[hp.lat, hp.lng] as LatLngTuple}
            icon={makeMosqIcon(riskColor(hp.risk_level), riskGlow(hp.risk_level))}>
            <Popup>
              <div className="w-48 bg-white rounded-xl overflow-hidden shadow-xl border border-slate-100">
                <div className="bg-slate-900 px-3 py-2">
                  <p className="font-bold text-xs text-white">{hp.location_estimate}</p>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${riskLabel(hp.risk_level)}`}>
                      {hp.risk_level}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">{Math.round(hp.risk_score*100)}% risk</span>
                  </div>
                  <p className="text-slate-600 text-[10px] leading-relaxed">{hp.reasoning}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}
      {travelers.length > 0 && <TravelLayer travelers={travelers} onAllDone={onTravelDone}/>}
    </>
  )
}

function NotificationModal({ hotspot, onClose, onSend }:
  { hotspot: HotspotPrediction; onClose: () => void; onSend: () => void }) {
  const msg = `DENGUE RISK ALERT - ${hotspot.location_estimate}

Dear Resident,

Our barangay monitoring system has detected a ${hotspot.risk_level} RISK area for mosquito breeding near your location (Risk Score: ${Math.round(hotspot.risk_score*100)}%).

IMMEDIATE ACTION REQUIRED - Please conduct the 4S Method:
- SEARCH and destroy all stagnant water containers
- SELF-PROTECTION - use repellents & wear long sleeves
- SEEK medical attention for fever lasting 2+ days
- SAY NO to dengue - inform your neighbors NOW

Unverified reports in your area remain unaddressed. Community action is our best defense.

- Molo District Health Monitoring System`

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[85vh] overflow-hidden animate-scale-in">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Bell size={18} className="text-rose-500"/>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Push Notification</h3>
              <p className="text-[10px] text-slate-400 font-medium">Residents within 500m radius</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={14} className="text-slate-500"/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${riskBg(hotspot.risk_level)}`}>
            <ShieldAlert size={10}/> {hotspot.risk_level} — {hotspot.location_estimate}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview Message</p>
            <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">{msg}</pre>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={() => { onSend(); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-all active:scale-95 flex items-center justify-center gap-2">
              <Bell size={12}/> Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MOLO_CENTER: LatLngTuple = [10.6953, 122.5447]
const ABM_URL = "http://localhost:5000"

export default function SimulationField({ onClose, reports }: SimulationFieldProps) {
  const [days,            setDays]            = useState(3)
  const [mapType,         setMapType]         = useState<"street"|"satellite">("street")
  const [isRunning,       setIsRunning]       = useState(false)
  const [result,          setResult]          = useState<SimulationResult | null>(null)
  const [notifyTarget,    setNotifyTarget]    = useState<HotspotPrediction | null>(null)
  const [sentNotifs,      setSentNotifs]      = useState<Set<string>>(new Set())
  const [activeTab,       setActiveTab]       = useState<"map"|"details">("map")
  const [travelers,       setTravelers]       = useState<TravelingMosq[]>([])
  const [visibleHotspots, setVisibleHotspots] = useState<HotspotPrediction[]>([])
  const [isAnimating,     setIsAnimating]     = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [progress,        setProgress]        = useState(0)

  const resultRef = useRef<SimulationResult | null>(null)
  useEffect(() => { resultRef.current = result }, [result])

  const runSimulation = useCallback(async () => {
    setIsRunning(true)
    setResult(null)
    setTravelers([])
    setVisibleHotspots([])
    setIsAnimating(false)
    setError(null)
    setProgress(0)

    let simResult: SimulationResult
    try {
      const payload = {
        days: Number(days),
        reports: (reports || []).map((r) => ({
          id: String(r._id),
          lat: Number(r.lat),
          lng: Number(r.lng),
          status: r.status,
          verified: Boolean(r.verified),
          accuracy: Number(r.accuracy ?? 0.85),
        })),
      }
      
      try {
        const res = await fetch(`${ABM_URL}/simulate-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        
        const reader = res.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()
          let buffer = ""
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines[lines.length - 1]
            
            for (let i = 0; i < lines.length - 1; i++) {
              if (lines[i].startsWith("data: ")) {
                try {
                  const event = JSON.parse(lines[i].slice(6))
                  setProgress(event.progress || 0)
                  
                  if (event.stage === "complete" && event.result) {
                    simResult = event.result
                  }
                } catch (e) {}
              }
            }
          }
        }
      } catch {
        const res = await fetch(`${ABM_URL}/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        simResult = await res.json()
      }
    } catch (err) {
      console.warn("ABM server unreachable, using fallback data:", err)
      setError("ABM server offline — showing demo data")
      simResult = {
        day: days,
        weather: { temp_c: 32.4, humidity: 81, wind_kph: 12.3, condition: "Partly Cloudy" },
        total_agents: 142 + days * 38,
        hotspot_predictions: [
          {
            lat: 10.6889, lng: 122.5441,
            risk_score: 0.91, risk_level: "CRITICAL", agent_count: 67,
            reasoning: "High humidity + 3 unverified stagnant water reports within 200m. Optimal breeding conditions forecast for next 48 hrs.",
            location_estimate: "San Juan, Molo",
          },
          {
            lat: 10.6850, lng: 122.5376,
            risk_score: 0.74, risk_level: "HIGH", agent_count: 43,
            reasoning: "Moderate rainfall accumulation + open drainage near market. Agent density trending upward.",
            location_estimate: "Calumpang, Molo",
          },
          {
            lat: 10.6901, lng: 122.5319,
            risk_score: 0.58, risk_level: "MODERATE", agent_count: 32,
            reasoning: "Low wind speed reduces dispersal. Uncleaned lot reported nearby increases stagnation risk.",
            location_estimate: "South Fundidor, Molo",
          },
        ],
        summary: `After ${days} day(s), mosquito agents have spread primarily toward low-drainage zones in San Juan. Warm temperatures (32°C) and high humidity (81%) create near-ideal breeding conditions. Immediate intervention recommended in San Juan and Calumpang sectors.`,
        risk_index: Math.min(0.95, 0.55 + days * 0.08),
        movement_analysis: {
          pattern: "Rapid Multiplication & Local Spread",
          dispersal_speed_km_day: 0.35,
          max_range_km: 1.23,
          concentration_ratio: 0.47,
          highest_density_location: "San Juan, Molo",
          secondary_spread: true,
        },
      }
    }

    setResult(simResult!)
    setIsRunning(false)
    setActiveTab("map")

    const seedPoints = reports.length > 0 ? reports : [{
      _id: "seed", lat: MOLO_CENTER[0], lng: MOLO_CENTER[1],
      locationName: "", status: "CRITICAL" as const, verified: true,
    }]

    const now = performance.now()
    const newTravelers: TravelingMosq[] = simResult!.hotspot_predictions.flatMap((hp, hi) => {
      const sorted = [...seedPoints]
        .sort((a, b) => Math.hypot(a.lat-hp.lat, a.lng-hp.lng) - Math.hypot(b.lat-hp.lat, b.lng-hp.lng))
        .slice(0, 3)
      return sorted.map((src, si) => ({
        id: `t-${hi}-${si}`,
        fromLat: src.lat, fromLng: src.lng,
        toLat: hp.lat,    toLng: hp.lng,
        color: riskColor(hp.risk_level),
        glow:  riskGlow(hp.risk_level),
        startTime: now + hi * 500 + si * 180,
        duration: 1700 + Math.random() * 700,
      }))
    })

    setIsAnimating(true)
    setTravelers(newTravelers)
  }, [days, reports])

  const handleTravelDone = useCallback(() => {
    setTravelers([])
    setIsAnimating(false)
    const preds = resultRef.current?.hotspot_predictions ?? []
    preds.forEach((hp, i) => {
      setTimeout(() => {
        setVisibleHotspots((prev) => {
          if (prev.some(v => v.lat === hp.lat && v.lng === hp.lng)) return prev
          return [...prev, hp]
        })
      }, i * 260)
    })
  }, [])

  const reset = () => {
    setResult(null); setTravelers([]); setVisibleHotspots([]); setIsAnimating(false); setError(null); setProgress(0)
  }

  const riskIndexColor = (idx: number) =>
    idx > 0.75 ? "text-rose-400" : idx > 0.5 ? "text-orange-400" : "text-amber-400"

  return (
    <div className="fixed inset-0 z-[800] bg-[#0a0a0a] flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <img src="/assets/images/Aedify.png" alt="Aedify" className="w-6 h-6 object-contain"/>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-white font-bold text-sm tracking-tight leading-none">ABM Simulation</h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Agent-Based Mosquito Spread Model</p>
            </div>
            {error && (
              <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                {error}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <Activity size={12} className={riskIndexColor(result.risk_index)}/>
              <span className="text-[10px] font-semibold text-slate-400">
                Risk: <span className={riskIndexColor(result.risk_index)}>{Math.round(result.risk_index*100)}%</span>
              </span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{width: `${progress}%`}}/>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{progress}%</span>
            </div>
          )}
          {isAnimating && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
              <span className="text-[10px] font-semibold text-slate-400">Dispersing...</span>
            </div>
          )}
          <button onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] font-semibold transition-all">
            <X size={13}/> Close
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[300px] bg-[#111] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">
          {/* Simulation period */}
          <div className="p-5 border-b border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Simulation Period</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-[10px] font-medium">1 day</span>
              <div className="text-center">
                <span className="text-3xl font-bold text-white">{days}</span>
                <span className="text-slate-500 text-[10px] font-medium ml-1">day{days!==1?"s":""}</span>
              </div>
              <span className="text-slate-500 text-[10px] font-medium">7 days</span>
            </div>
            <div className="relative h-8 flex items-center">
              <div className="absolute w-full h-1 bg-slate-800 rounded-full"/>
              <div className="absolute h-1 bg-white rounded-full transition-all"
                   style={{ width:`${((days-1)/6)*100}%` }}/>
              <input type="range" min={1} max={7} value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="relative w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-black/50"/>
            </div>
            <div className="flex justify-between mt-1">
              {[1,2,3,4,5,6,7].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`w-6 h-6 rounded-full text-[9px] font-bold transition-all ${days===d?"bg-white text-black":"bg-slate-800 text-slate-500 hover:bg-slate-700"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Input reports */}
          <div className="p-5 border-b border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Input Reports</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-800/50 text-center">
                <p className="text-xl font-bold text-white">{reports.filter(r=>r.verified).length}</p>
                <p className="text-[9px] font-medium text-emerald-400 mt-0.5">Verified</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 text-center">
                <p className="text-xl font-bold text-white">{reports.filter(r=>!r.verified).length}</p>
                <p className="text-[9px] font-medium text-amber-400 mt-0.5">Unverified</p>
              </div>
            </div>
          </div>

          {/* Run button */}
          <div className="p-5 border-b border-white/5">
            <button onClick={runSimulation} disabled={isRunning||isAnimating}
              className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 disabled:opacity-40 text-black text-[11px] font-bold uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              {isRunning    ? <><Loader2 size={14} className="animate-spin"/>Running...</>
               : isAnimating ? <><Bug size={14} className="animate-bounce"/>Traveling...</>
               :               <><Play size={14} fill="currentColor"/>Run Simulation</>}
            </button>
            {result && !isAnimating && (
              <button onClick={reset}
                className="w-full mt-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5">
                <RotateCcw size={11}/> Reset
              </button>
            )}
          </div>

          {/* Weather */}
          {result && (
            <div className="p-5 border-b border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Weather · Day {result.day}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon:<Thermometer size={14} className="text-orange-400 shrink-0"/>, value:`${result.weather.temp_c}°C`,    label:"Temp"     },
                  { icon:<Droplets    size={14} className="text-blue-400 shrink-0"/>,   value:`${result.weather.humidity}%`,    label:"Humidity" },
                  { icon:<Wind        size={14} className="text-cyan-400 shrink-0"/>,   value:`${result.weather.wind_kph} kph`, label:"Wind"     },
                  { icon:<Bug         size={14} className="text-rose-400 shrink-0"/>,   value:`${result.total_agents}`,         label:"Agents"   },
                ].map(item => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-slate-800/50 flex items-center gap-2">
                    {item.icon}
                    <div>
                      <p className="text-xs font-bold text-white">{item.value}</p>
                      <p className="text-[9px] text-slate-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predicted hotspots */}
          {result && result.hotspot_predictions.length > 0 && (
            <div className="p-5 flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Predicted Hotspots</p>
              <div className="space-y-2">
                {result.hotspot_predictions.map((hp, i) => {
                  const isVisible = visibleHotspots.some(v => v.lat===hp.lat && v.lng===hp.lng)
                  return (
                    <div key={i}
                      className={`p-3 rounded-xl border transition-all duration-500 ${isVisible
                        ? "bg-slate-800/50 border-white/10"
                        : "bg-slate-800/20 border-white/5 opacity-40"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${riskBg(hp.risk_level)}`}>
                          {hp.risk_level}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!isVisible && isAnimating && (
                            <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor:riskColor(hp.risk_level) }}/>
                          )}
                          <span className="text-[10px] font-bold text-white">{Math.round(hp.risk_score*100)}%</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold text-white mb-0.5 flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400"/> {hp.location_estimate}
                      </p>
                      <p className="text-[9px] text-slate-500 line-clamp-2 mb-2">{hp.reasoning}</p>
                      <button
                        onClick={() => setNotifyTarget(hp)}
                        disabled={sentNotifs.has(hp.location_estimate) || !isVisible}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                          sentNotifs.has(hp.location_estimate)
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : !isVisible
                            ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                            : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white active:scale-95"}`}>
                        {sentNotifs.has(hp.location_estimate)
                          ? <><Users size={10}/>Notified</>
                          : <><Bell  size={10}/>Notify</>}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-[#0a0a0a] shrink-0">
            {(["map","details"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-t-lg transition-all ${activeTab===tab?"bg-[#111] text-white":"text-slate-500 hover:text-slate-300"}`}>
                {tab==="map"?"Live Map":"Analysis"}
              </button>
            ))}
          </div>

          {activeTab==="map" && (
            <div className="flex-1 relative bg-[#111] overflow-hidden">
              <MapContainer center={MOLO_CENTER} zoom={14} className="w-full h-full" zoomControl={false}>
                <MapScene
                  reports={reports} mapType={mapType}
                  visibleHotspots={visibleHotspots}
                  travelers={travelers}
                  onTravelDone={handleTravelDone}
                />
              </MapContainer>

              {/* Map type toggle */}
              <div className="absolute bottom-4 left-4 z-[400] bg-[#111]/90 backdrop-blur-md p-1 rounded-lg border border-white/10 flex gap-0.5">
                <button onClick={() => setMapType("street")}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${mapType==="street"?"bg-white text-black":"text-slate-400 hover:text-white"}`}>
                  Dark
                </button>
                <button onClick={() => setMapType("satellite")}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md flex items-center gap-1.5 transition-all ${mapType==="satellite"?"bg-white text-black":"text-slate-400 hover:text-white"}`}>
                  <Layers size={11}/> Sat
                </button>
              </div>

              {/* Legend */}
              <div className="absolute top-4 right-4 z-[400] bg-[#111]/90 backdrop-blur-md rounded-xl p-3 border border-white/10">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legend</p>
                <div className="space-y-1.5">
                  {[
                    { color:"#10b981", label:"Verified",     shape:"circle" },
                    { color:"#6b7280", label:"Unverified",   shape:"circle" },
                    { color:"#ef4444", label:"Critical", shape:"square" },
                    { color:"#f97316", label:"High",     shape:"square" },
                    { color:"#fbbf24", label:"Moderate", shape:"square" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 ${l.shape==="circle"?"rounded-full":"rounded-sm"} border border-white/20`}
                           style={{ backgroundColor:l.color }}/>
                      <span className="text-[9px] font-medium text-slate-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empty state */}
              {!result && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none">
                  <div className="bg-[#111]/90 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/10">
                    <FlaskConical size={36} className="text-slate-600 mx-auto mb-3"/>
                    <p className="text-white font-bold text-sm">Set Days & Run Simulation</p>
                    <p className="text-slate-500 text-xs mt-1">ABM will predict spread patterns</p>
                  </div>
                </div>
              )}

              {/* Running state */}
              {isRunning && (
                <div className="absolute inset-0 flex items-center justify-center z-[300] bg-black/40 backdrop-blur-sm">
                  <div className="bg-[#111] rounded-2xl p-8 text-center border border-white/10">
                    <Loader2 size={32} className="text-white animate-spin mx-auto mb-3"/>
                    <p className="text-white font-bold text-sm">Running ABM for {days} day{days!==1?"s":""}...</p>
                    <p className="text-slate-500 text-xs mt-1">Dispatching {reports.length} seed agents</p>
                    <div className="mt-4 w-40 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-white transition-all" style={{width: `${progress}%`}}/>
                    </div>
                    <p className="text-white text-[10px] font-bold mt-2 uppercase">{progress}% Complete</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="details" && (
            <div className="flex-1 bg-[#111] p-8 overflow-y-auto">
              {!result ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Activity size={40} className="text-slate-700 mx-auto mb-3"/>
                    <p className="text-slate-500 font-medium text-sm">Run a simulation to see analysis</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl space-y-5">
                  <div>
                    <h2 className="text-white font-bold text-xl tracking-tight mb-0.5">Simulation Analysis</h2>
                    <p className="text-slate-500 text-xs">Day {result.day} Projection · {result.total_agents} Agents Modeled</p>
                  </div>

                  {result.movement_analysis && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Bug size={10}/> Movement Pattern
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white font-bold text-sm">{result.movement_analysis.pattern}</p>
                          <p className="text-slate-500 text-xs mt-0.5">Primary dispersal mode</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500 text-xs">Speed:</span>
                            <span className="text-white font-bold text-xs">{result.movement_analysis.dispersal_speed_km_day} km/day</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 text-xs">Range:</span>
                            <span className="text-white font-bold text-xs">{result.movement_analysis.max_range_km} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 text-xs">Concentration:</span>
                            <span className="text-white font-bold text-xs">{Math.round(result.movement_analysis.concentration_ratio * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</p>
                    <p className="text-slate-300 text-xs leading-relaxed">{result.summary}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Hotspot Predictions</p>
                    <div className="space-y-3">
                      {result.hotspot_predictions.map((hp, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-bold text-sm">{hp.location_estimate}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">
                                {hp.lat.toFixed(4)}, {hp.lng.toFixed(4)} · {hp.agent_count} agents
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${riskBg(hp.risk_level)}`}>
                              {hp.risk_level}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
                            <div className="h-1.5 rounded-full transition-all"
                                 style={{ width:`${hp.risk_score*100}%`, backgroundColor:riskColor(hp.risk_level) }}/>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{hp.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {notifyTarget && (
        <NotificationModal
          hotspot={notifyTarget}
          onClose={() => setNotifyTarget(null)}
          onSend={() => setSentNotifs((prev) => new Set(prev).add(notifyTarget!.location_estimate))}
        />
      )}
    </div>
  )
}
