/**
 * SimulationField.tsx — Aedify LGU Dashboard
 * Agent-Based Mosquito Spread Simulation UI · Molo District, Iloilo City
 *
 * Calls POST http://localhost:5000/simulate (see abm_server.py)
 *
 * ─── PLACEHOLDERS ────────────────────────────────────────────────────────────
 *  [PLACEHOLDER: REPORTS]      — reports prop currently passed from parent.
 *                                In production, fetch from your NoSQL DB
 *                                (verified reports collection, ERD Fig. 4).
 *  [PLACEHOLDER: LOGO]         — replace logo import with your actual asset path.
 *  [PLACEHOLDER: ABM_URL]      — change ABM_URL to your deployed FastAPI host.
 *  [PLACEHOLDER: NOTIFICATION] — onSend() currently just marks UI state.
 *                                Wire to your push notification service
 *                                (Feedback Layer in Software Architecture Fig. 3).
 *  [PLACEHOLDER: MAP_CENTER]   — MOLO_CENTER is hardcoded; derive from barangay
 *                                selection if you expand to other districts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, useMap, Popup } from "react-leaflet";
import L, { LatLngTuple, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  X, Wind, Droplets, Thermometer,
  Bell, Layers, Play, RotateCcw, Loader2,
  Bug, MapPin, Activity, Users, ShieldAlert
} from "lucide-react";

// [PLACEHOLDER: LOGO] — replace with your actual logo import
import logo from '../../assets/images/Aedify.png';

// ─── Inject global CSS once ───────────────────────────────────────────────────

const STYLE_ID = "mosq-sim-styles";
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes mosq-arrive {
      0%   { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
      60%  { transform: translate(-50%,-50%) scale(0.85); opacity: 1; }
      80%  { transform: translate(-50%,-50%) scale(1.1); }
      100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
    }
    @keyframes mosq-wings-l {
      0%,100% { transform-origin:31px 30px; transform:rotateY(0deg); }
      50%     { transform-origin:31px 30px; transform:rotateY(160deg); }
    }
    @keyframes mosq-wings-r {
      0%,100% { transform-origin:33px 30px; transform:rotateY(0deg); }
      50%     { transform-origin:33px 30px; transform:rotateY(-160deg); }
    }
    @keyframes pulse-ring {
      0%   { transform:translate(-50%,-50%) scale(1);   opacity:0.7; }
      100% { transform:translate(-50%,-50%) scale(2.8); opacity:0;   }
    }
    .mosq-icon-svg {
      position:absolute; top:50%; left:50%;
      animation: mosq-arrive 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .mosq-pulse-ring {
      position:absolute; top:50%; left:50%;
      width:36px; height:36px;
      border-radius:50%;
      animation: pulse-ring 1.5s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimReport {
  _id: string;
  lat: number;
  lng: number;
  locationName: string;
  status: "CRITICAL" | "HIGH" | "MODERATE";
  verified: boolean;
  accuracy?: number;
  // Convex report fields
  userId?: string;
  userName?: string;
  description?: string;
  detections?: string;
  reasoning?: string;
  imageUri?: string;
}

interface HotspotPrediction {
  lat: number;
  lng: number;
  risk_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MODERATE";
  agent_count: number;
  reasoning: string;
  location_estimate: string;
}

interface SimulationResult {
  day: number;
  weather: { temp_c: number; humidity: number; wind_kph: number; condition: string };
  total_agents: number;
  hotspot_predictions: HotspotPrediction[];
  summary: string;
  risk_index: number;
  movement_analysis?: {
    pattern: string;
    dispersal_speed_km_day: number;
    max_range_km: number;
    concentration_ratio: number;
    highest_density_location: string;
    secondary_spread: boolean;
  };
  ai_insights?: string;
}

interface SimulationFieldProps {
  onClose: () => void;
  reports: SimReport[]; // [PLACEHOLDER: REPORTS] — pass verified reports from your DB query
}

interface TravelingMosq {
  id: string;
  fromLat: number; fromLng: number;
  toLat: number;   toLng: number;
  color: string;   glow: string;
  startTime: number;
  duration: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(level: string) {
  if (level === "CRITICAL") return "#ef4444";
  if (level === "HIGH")     return "#f97316";
  return "#fbbf24";
}
function riskGlow(level: string) {
  if (level === "CRITICAL") return "rgba(239,68,68,0.6)";
  if (level === "HIGH")     return "rgba(249,115,22,0.6)";
  return "rgba(251,191,36,0.6)";
}
function riskBg(level: string) {
  if (level === "CRITICAL") return "bg-rose-50 text-rose-600 border-rose-200";
  if (level === "HIGH")     return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-amber-50 text-amber-600 border-amber-200";
}
function easeInOut(t: number) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// ─── Mosquito DivIcon ─────────────────────────────────────────────────────────

function makeMosqIcon(color: string, glowColor: string): DivIcon {
  const s = 44;
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
</div>`;
  return L.divIcon({ html, className: "", iconSize: [s, s], iconAnchor: [s/2, s/2], popupAnchor: [0, -s/2] });
}

// ─── Canvas travel layer ──────────────────────────────────────────────────────

function TravelLayer({ travelers, onAllDone }: { travelers: TravelingMosq[]; onAllDone: () => void }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (!travelers.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = map.getContainer();
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext("2d")!;
    const toXY = (lat: number, lng: number) => {
      const p = map.latLngToContainerPoint([lat, lng]);
      return { x: p.x, y: p.y };
    };
    function frame() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      const now = performance.now();
      let allDone = true;
      for (const t of travelers) {
        const elapsed = Math.max(0, now - t.startTime);
        const raw     = Math.min(1, elapsed / t.duration);
        const prog    = easeInOut(raw);
        if (raw < 1) allDone = false;
        const from = toXY(t.fromLat, t.fromLng);
        const to   = toXY(t.toLat,   t.toLng);
        const cx = from.x + (to.x - from.x) * prog;
        const cy = from.y + (to.y - from.y) * prog - Math.sin(prog * Math.PI) * 65;
        const np   = Math.min(1, prog + 0.02);
        const nx   = from.x + (to.x - from.x) * easeInOut(np);
        const ny   = from.y + (to.y - from.y) * easeInOut(np) - Math.sin(easeInOut(np) * Math.PI) * 65;
        const angle = Math.atan2(ny - cy, nx - cx) + Math.PI / 2;
        for (let i = 10; i >= 1; i--) {
          const tp = Math.max(0, prog - (i / 10) * 0.1);
          const tx = from.x + (to.x - from.x) * easeInOut(tp);
          const ty = from.y + (to.y - from.y) * easeInOut(tp) - Math.sin(easeInOut(tp) * Math.PI) * 65;
          ctx.beginPath();
          ctx.arc(tx, ty, 2.2 * (1 - i/10), 0, Math.PI*2);
          const alpha = Math.round((1 - i/10) * 0x44).toString(16).padStart(2,"0");
          ctx.fillStyle = t.color + alpha;
          ctx.fill();
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.shadowColor = t.glow;
        ctx.shadowBlur  = 12;
        ctx.beginPath();
        ctx.ellipse(0, 5, 3.5, 10, 0, 0, Math.PI*2);
        ctx.fillStyle = t.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -7, 3.5, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, -17);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        const flap = Math.sin(now * 0.045) * 0.35;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(-9, -1, 9, 4.5, -flap, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(9, -1, 9, 4.5, flap, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (allDone) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        onAllDone();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    };
  }, [travelers, map, onAllDone]);

  return (
    <canvas ref={canvasRef}
      style={{ position:"absolute", top:0, left:0, zIndex:450, pointerEvents:"none", width:"100%", height:"100%" }} />
  );
}

// ─── Map scene ────────────────────────────────────────────────────────────────

function MapScene({ reports, mapType, visibleHotspots, travelers, onTravelDone }:
  { reports: SimReport[]; mapType: "street"|"satellite"; visibleHotspots: HotspotPrediction[];
    travelers: TravelingMosq[]; onTravelDone: () => void }) {
  return (
    <>
      {mapType === "street"
        ? <TileLayer attribution="&copy; Stadia Maps" url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"/>
        : <TileLayer attribution="&copy; Esri"        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/>
      }
      {/* [PLACEHOLDER: REPORTS] Source report markers from your DB */}
      {reports.map((rpt) => (
        <CircleMarker key={rpt._id}
          center={[rpt.lat, rpt.lng] as LatLngTuple} radius={6}
          pathOptions={{ color:"white", fillColor: rpt.verified ? "#10b981" : "#6b7280", fillOpacity:0.9, weight:1.5 }}>
          <Popup>
            <div className="w-48 bg-slate-50 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2">
                <p className="font-bold text-xs text-white">{rpt.locationName || "Unknown Location"}</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600">Status:</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                    rpt.status === "CRITICAL" ? "bg-red-100 text-red-700" :
                    rpt.status === "HIGH" ? "bg-orange-100 text-orange-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{rpt.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600">Verified:</span>
                  <span className="text-[9px] font-bold">{rpt.verified ? "✅ Yes" : "⏳ No"}</span>
                </div>
                {rpt.accuracy && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600">Accuracy:</span>
                    <span className="text-[9px] font-bold text-cyan-600">{Math.round(rpt.accuracy * 100)}%</span>
                  </div>
                )}
                {rpt.userName && (
                  <div className="border-t pt-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-500">Reporter: </span>
                    <span className="text-[9px] text-slate-700">{rpt.userName}</span>
                  </div>
                )}
                {rpt.detections && (
                  <div className="text-[9px] text-slate-600 italic">
                    Detections: {rpt.detections}
                  </div>
                )}
                {rpt.description && (
                  <div className="text-[9px] text-slate-600 line-clamp-2">
                    {rpt.description}
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
              <p className="font-black text-xs">{hp.location_estimate}</p>
              <p className="text-[10px] text-gray-500">{hp.risk_level} · {Math.round(hp.risk_score*100)}% risk</p>
              <p className="text-gray-600 mt-1 text-[10px]">{hp.reasoning}</p>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}
      {travelers.length > 0 && <TravelLayer travelers={travelers} onAllDone={onTravelDone}/>}
    </>
  );
}

// ─── Notification Modal ────────────────────────────────────────────────────────
// [PLACEHOLDER: NOTIFICATION] — onSend wires to push notification service

function NotificationModal({ hotspot, onClose, onSend }:
  { hotspot: HotspotPrediction; onClose: () => void; onSend: () => void }) {
  const msg = `🚨 DENGUE RISK ALERT — ${hotspot.location_estimate}

Dear Resident,

Our barangay monitoring system has detected a ${hotspot.risk_level} RISK area for mosquito breeding near your location (Risk Score: ${Math.round(hotspot.risk_score*100)}%).

IMMEDIATE ACTION REQUIRED — Please conduct the 4S Method:
• SEARCH and destroy all stagnant water containers
• SELF-PROTECTION — use repellents & wear long sleeves
• SEEK medical attention for fever lasting 2+ days
• SAY NO to dengue — inform your neighbors NOW

Unverified reports in your area remain unaddressed. Community action is our best defense.

— Molo District Health Monitoring System`;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-[480px] max-h-[85vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center"><Bell size={18} className="text-rose-600"/></div>
            <div>
              <h3 className="font-black text-slate-900 text-base tracking-tight">Push Notification</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Residents within 500m radius</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={14}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${riskBg(hotspot.risk_level)}`}>
            <ShieldAlert size={10}/> {hotspot.risk_level} — {hotspot.location_estimate}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview Message</p>
            <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 rounded-2xl p-4 border border-slate-100 whitespace-pre-wrap leading-relaxed">{msg}</pre>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={() => { onSend(); onClose(); }}
              className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2">
              <Bell size={12}/> Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// [PLACEHOLDER: MAP_CENTER] — hardcoded Molo center; derive from barangay selection if needed
const MOLO_CENTER: LatLngTuple = [10.6953, 122.5447];

// [PLACEHOLDER: ABM_URL] — change to your deployed FastAPI host in production
const ABM_URL = "http://localhost:5000";

export default function SimulationField({ onClose, reports }: SimulationFieldProps) {
  const [days,            setDays]            = useState(3);
  const [mapType,         setMapType]         = useState<"street"|"satellite">("street");
  const [isRunning,       setIsRunning]       = useState(false);
  const [result,          setResult]          = useState<SimulationResult | null>(null);
  const [notifyTarget,    setNotifyTarget]    = useState<HotspotPrediction | null>(null);
  const [sentNotifs,      setSentNotifs]      = useState<Set<string>>(new Set());
  const [activeTab,       setActiveTab]       = useState<"map"|"details">("map");
  const [travelers,       setTravelers]       = useState<TravelingMosq[]>([]);
  const [visibleHotspots, setVisibleHotspots] = useState<HotspotPrediction[]>([]);
  const [isAnimating,     setIsAnimating]     = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [progress,        setProgress]        = useState(0);

  const resultRef = useRef<SimulationResult | null>(null);
  useEffect(() => { resultRef.current = result; }, [result]);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    setTravelers([]);
    setVisibleHotspots([]);
    setIsAnimating(false);
    setError(null);
    setProgress(0);

    let simResult: SimulationResult;
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
      };
      
      // Try streaming endpoint first for real-time updates
      try {
        const res = await fetch(`${ABM_URL}/simulate-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        
        const reader = res.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines[lines.length - 1];
            
            for (let i = 0; i < lines.length - 1; i++) {
              if (lines[i].startsWith("data: ")) {
                try {
                  const event = JSON.parse(lines[i].slice(6));
                  setProgress(event.progress || 0);
                  
                  if (event.stage === "complete" && event.result) {
                    simResult = event.result;
                  }
                } catch (e) {}
              }
            }
          }
        }
      } catch {
        // Fallback to standard endpoint
        const res = await fetch(`${ABM_URL}/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        simResult = await res.json();
      }
    } catch (err) {
      // ── FALLBACK DATA ─────────────────────────────────────────────────────
      console.warn("ABM server unreachable, using fallback data:", err);
      setError("ABM server offline — showing demo data");
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
      };
    }

    setResult(simResult!);
    setIsRunning(false);
    setActiveTab("map");

    const seedPoints = reports.length > 0 ? reports : [{
      _id: "seed", lat: MOLO_CENTER[0], lng: MOLO_CENTER[1],
      locationName: "", status: "CRITICAL" as const, verified: true,
    }];

    const now = performance.now();
    const newTravelers: TravelingMosq[] = simResult!.hotspot_predictions.flatMap((hp, hi) => {
      const sorted = [...seedPoints]
        .sort((a, b) => Math.hypot(a.lat-hp.lat, a.lng-hp.lng) - Math.hypot(b.lat-hp.lat, b.lng-hp.lng))
        .slice(0, 3);
      return sorted.map((src, si) => ({
        id: `t-${hi}-${si}`,
        fromLat: src.lat, fromLng: src.lng,
        toLat: hp.lat,    toLng: hp.lng,
        color: riskColor(hp.risk_level),
        glow:  riskGlow(hp.risk_level),
        startTime: now + hi * 500 + si * 180,
        duration: 1700 + Math.random() * 700,
      }));
    });

    setIsAnimating(true);
    setTravelers(newTravelers);
  }, [days, reports]);

  const handleTravelDone = useCallback(() => {
    setTravelers([]);
    setIsAnimating(false);
    const preds = resultRef.current?.hotspot_predictions ?? [];
    preds.forEach((hp, i) => {
      setTimeout(() => {
        setVisibleHotspots((prev) => {
          if (prev.some(v => v.lat === hp.lat && v.lng === hp.lng)) return prev;
          return [...prev, hp];
        });
      }, i * 260);
    });
  }, []);

  const reset = () => {
    setResult(null); setTravelers([]); setVisibleHotspots([]); setIsAnimating(false); setError(null); setProgress(0);
  };

  const riskIndexColor = (idx: number) =>
    idx > 0.75 ? "text-rose-600" : idx > 0.5 ? "text-orange-500" : "text-amber-500";

  return (
    <div className="fixed inset-0 z-[800] bg-slate-950 flex flex-col animate-in fade-in duration-400">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            {/* [PLACEHOLDER: LOGO] */}
            <img src={logo} alt="Aedify" className="w-full h-full object-contain rounded-2xl"/>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight leading-none">Simulation Field</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">Agent-Based Mosquito Spread Model · Molo District</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">{error}</span>
            </div>
          )}
          {result && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Activity size={12} className={riskIndexColor(result.risk_index)}/>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Risk Index: <span className={riskIndexColor(result.risk_index)}>{Math.round(result.risk_index*100)}%</span>
              </span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="w-20 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{width: `${progress}%`}}/>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{progress}%</span>
            </div>
          )}
          {isAnimating && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"/>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">🦟 Agents Dispersing…</span>
            </div>
          )}
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-black uppercase tracking-widest transition-all">
            <X size={13}/> Exit Sim
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-[320px] bg-slate-900 border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">

          {/* Day slider */}
          <div className="p-6 border-b border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Simulation Period</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-bold">1 day</span>
              <div className="text-center">
                <span className="text-4xl font-black text-white">{days}</span>
                <span className="text-slate-400 text-xs font-bold ml-1">day{days!==1?"s":""}</span>
              </div>
              <span className="text-slate-400 text-xs font-bold">7 days</span>
            </div>
            <div className="relative h-10 flex items-center">
              <div className="absolute w-full h-1.5 bg-slate-700 rounded-full"/>
              <div className="absolute h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                   style={{ width:`${((days-1)/6)*100}%` }}/>
              <input type="range" min={1} max={7} value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="relative w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-900/60 [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-cyan-400"/>
            </div>
            <div className="flex justify-between mt-1">
              {[1,2,3,4,5,6,7].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`w-6 h-6 rounded-full text-[9px] font-black transition-all ${days===d?"bg-cyan-500 text-white shadow-lg shadow-cyan-900/40":"bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Reports summary */}
          <div className="p-6 border-b border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Input Reports</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-slate-800 border border-white/5 text-center">
                <p className="text-2xl font-black text-white">{reports.filter(r=>r.verified).length}</p>
                <p className="text-[9px] font-bold text-emerald-400 uppercase mt-0.5">Verified</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800 border border-white/5 text-center">
                <p className="text-2xl font-black text-white">{reports.filter(r=>!r.verified).length}</p>
                <p className="text-[9px] font-bold text-amber-400 uppercase mt-0.5">Unverified</p>
              </div>
            </div>
          </div>

          {/* Run button */}
          <div className="p-6 border-b border-white/5">
            <button onClick={runSimulation} disabled={isRunning||isAnimating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-2">
              {isRunning    ? <><Loader2 size={14} className="animate-spin"/>Running ABM…</>
               : isAnimating ? <><Bug size={14} className="animate-bounce"/>🦟 Agents Traveling…</>
               :               <><Play size={14} fill="currentColor"/>Run Simulation</>}
            </button>
            {result && !isAnimating && (
              <button onClick={reset}
                className="w-full mt-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5">
                <RotateCcw size={11}/> Reset
              </button>
            )}
          </div>

          {/* Weather */}
          {result && (
            <div className="p-6 border-b border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                Weather · Day {result.day}
                <span className="ml-2 text-slate-600 normal-case font-medium">{result.weather.condition}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon:<Thermometer size={14} className="text-orange-400 shrink-0"/>, value:`${result.weather.temp_c}°C`,    label:"Temp"     },
                  { icon:<Droplets    size={14} className="text-blue-400 shrink-0"/>,   value:`${result.weather.humidity}%`,    label:"Humidity" },
                  { icon:<Wind        size={14} className="text-cyan-400 shrink-0"/>,   value:`${result.weather.wind_kph} kph`, label:"Wind"     },
                  { icon:<Bug         size={14} className="text-rose-400 shrink-0"/>,   value:`${result.total_agents}`,         label:"Agents"   },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-2xl bg-slate-800 border border-white/5 flex items-center gap-2">
                    {item.icon}
                    <div>
                      <p className="text-xs font-black text-white">{item.value}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotspot list */}
          {result && result.hotspot_predictions.length > 0 && (
            <div className="p-6 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Predicted Hotspots</p>
              <div className="space-y-3">
                {result.hotspot_predictions.map((hp, i) => {
                  const isVisible = visibleHotspots.some(v => v.lat===hp.lat && v.lng===hp.lng);
                  return (
                    <div key={i}
                      className={`p-4 rounded-2xl border transition-all duration-500 ${isVisible
                        ? "bg-slate-800 border-white/10 hover:border-cyan-500/30"
                        : "bg-slate-800/40 border-white/5 opacity-50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${riskBg(hp.risk_level)}`}>
                          {hp.risk_level}
                        </span>
                        <div className="flex items-center gap-2">
                          {!isVisible && isAnimating && (
                            <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor:riskColor(hp.risk_level) }}/>
                          )}
                          <span className="text-[10px] font-black text-cyan-400">{Math.round(hp.risk_score*100)}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-black text-white mb-1 flex items-center gap-1">
                        🦟 <MapPin size={10} className="text-slate-400"/> {hp.location_estimate}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium line-clamp-2 mb-3">{hp.reasoning}</p>
                      {/* [PLACEHOLDER: NOTIFICATION] — onSend wires to push notification service */}
                      <button
                        onClick={() => setNotifyTarget(hp)}
                        disabled={sentNotifs.has(hp.location_estimate) || !isVisible}
                        className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                          sentNotifs.has(hp.location_estimate)
                            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 cursor-default"
                            : !isVisible
                            ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                            : "bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 active:scale-95"}`}>
                        {sentNotifs.has(hp.location_estimate)
                          ? <><Users size={10}/>Notified</>
                          : <><Bell  size={10}/>Notify Residents</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Map + details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-6 pt-4 pb-0 bg-slate-950 shrink-0">
            {(["map","details"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${activeTab===t?"bg-slate-900 text-white":"text-slate-500 hover:text-slate-300"}`}>
                {t==="map"?"Live Map":"Analysis"}
              </button>
            ))}
          </div>

          {activeTab==="map" && (
            <div className="flex-1 relative bg-slate-900 overflow-hidden">
              <MapContainer center={MOLO_CENTER} zoom={14} className="w-full h-full" zoomControl={false}>
                <MapScene
                  reports={reports} mapType={mapType}
                  visibleHotspots={visibleHotspots}
                  travelers={travelers}
                  onTravelDone={handleTravelDone}
                />
              </MapContainer>

              {/* Map type toggle */}
              <div className="absolute bottom-6 left-6 z-[400] bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex gap-1">
                <button onClick={() => setMapType("street")}
                  className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${mapType==="street"?"bg-white text-slate-900 shadow":"text-slate-400 hover:text-white"}`}>
                  Dark
                </button>
                <button onClick={() => setMapType("satellite")}
                  className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all ${mapType==="satellite"?"bg-white text-slate-900 shadow":"text-slate-400 hover:text-white"}`}>
                  <Layers size={12}/> Satellite
                </button>
              </div>

              {/* Legend */}
              <div className="absolute top-6 right-6 z-[400] bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Legend</p>
                {[
                  { color:"#10b981", label:"Verified Report",     shape:"circle" },
                  { color:"#6b7280", label:"Unverified Report",   shape:"circle" },
                  { color:"#ef4444", label:"🦟 Critical Hotspot", shape:"square" },
                  { color:"#f97316", label:"🦟 High Hotspot",     shape:"square" },
                  { color:"#fbbf24", label:"🦟 Moderate Hotspot", shape:"square" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${l.shape==="circle"?"rounded-full":"rounded-sm"} border-2 border-white/30`}
                         style={{ backgroundColor:l.color }}/>
                    <span className="text-[9px] font-bold text-slate-300">{l.label}</span>
                  </div>
                ))}
              </div>

              {!result && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center z-[300] pointer-events-none">
                  <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/10 shadow-2xl">
                    <Bug size={40} className="text-slate-500 mx-auto mb-4"/>
                    <p className="text-white font-black text-lg">Set Days & Run Simulation</p>
                    <p className="text-slate-400 text-xs mt-1">ABM will predict spread patterns based on<br/>weather, reports, and AI detection weights.</p>
                  </div>
                </div>
              )}
              {isRunning && (
                <div className="absolute inset-0 flex items-center justify-center z-[300] bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-slate-900 rounded-3xl p-8 text-center border border-cyan-500/30 shadow-2xl">
                    <Loader2 size={36} className="text-cyan-400 animate-spin mx-auto mb-4"/>
                    <p className="text-white font-black">Running ABM for {days} day{days!==1?"s":""}…</p>
                    <p className="text-slate-400 text-xs mt-1">Dispatching {reports.length} seed agents from {reports.filter(r=>r.verified).length} verified sites</p>
                    <div className="mt-4 w-48 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{width: `${progress}%`}}/>
                    </div>
                    <p className="text-cyan-400 text-[10px] font-black mt-2 uppercase">{progress}% Complete</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="details" && (
            <div className="flex-1 bg-slate-900 p-8 overflow-y-auto">
              {!result ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Activity size={48} className="text-slate-600 mx-auto mb-4"/>
                    <p className="text-slate-400 font-bold">Run a simulation to see analysis</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl space-y-6">
                  <div>
                    <h2 className="text-white font-black text-2xl tracking-tight mb-1">Simulation Analysis</h2>
                    <p className="text-slate-400 text-sm">Day {result.day} Projection · {result.total_agents} Agents Modeled</p>
                  </div>

                  {/* Movement Analysis */}
                  {result.movement_analysis && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30">
                      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Bug size={10}/> Movement Pattern Analysis
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white font-black text-sm mb-1">{result.movement_analysis.pattern}</p>
                          <p className="text-slate-300 text-xs">Primary dispersal mode based on weather & population dynamics</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Dispersal Speed:</span>
                            <span className="text-cyan-400 font-black text-sm">{result.movement_analysis.dispersal_speed_km_day} km/day</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Max Range:</span>
                            <span className="text-cyan-400 font-black text-sm">{result.movement_analysis.max_range_km} km</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Concentration:</span>
                            <span className="text-cyan-400 font-black text-sm">{Math.round(result.movement_analysis.concentration_ratio * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {result.ai_insights && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30">
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        🤖 AI-Powered Epidemiological Insights (Ollama llama3.2)
                      </p>
                      <p className="text-slate-200 text-sm leading-relaxed font-medium">{result.ai_insights}</p>
                    </div>
                  )}

                  {/* Main Summary */}
                  <div className="p-5 rounded-2xl bg-slate-800 border border-white/5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Activity size={10}/> Model Output
                    </p>
                    <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Hotspot Breakdown */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hotspot Predictions</p>
                    <div className="space-y-4">
                      {result.hotspot_predictions.map((hp, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-slate-800 border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-white font-black text-sm">🦟 {hp.location_estimate}</p>
                              <p className="text-slate-400 text-[10px] font-bold mt-0.5">
                                {hp.lat.toFixed(4)}, {hp.lng.toFixed(4)} · {hp.agent_count} agents
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${riskBg(hp.risk_level)}`}>
                              {hp.risk_level}
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                            <div className="h-2 rounded-full transition-all"
                                 style={{ width:`${hp.risk_score*100}%`, backgroundColor:riskColor(hp.risk_level) }}/>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{hp.reasoning}</p>
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
  );
}