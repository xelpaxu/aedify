import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, ShieldCheck, Zap, MapPin, Layers, Crosshair, BarChart3, FlaskConical } from "lucide-react";
import { useAuth } from "../App";
import { LatLngTuple } from "leaflet";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import SimulationField from "../pages/SimulationField";
import { useNavigate } from "react-router-dom";

interface Sector {
  name: string;
  center: LatLngTuple;
  zoom: number;
}

const SECTOR_VIEWS: Record<string, Sector> = {
  molo_district: { name: "Molo District", center: [10.6953, 122.5447], zoom: 14 },
  san_juan: { name: "San Juan, Molo", center: [10.688934672295565, 122.54406972520161], zoom: 18 },
  calumpang: { name: "Calumpang, Molo", center: [10.684981527314973, 122.53764295728061], zoom: 17 },
  south_fundidor: { name: "South Fundidor, Molo", center: [10.690069890430216, 122.53190738825322], zoom: 18 },
};

function MapUpdater({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

export default function RiskMap() {
  const [mapType, setMapType] = useState<"street" | "satellite">("street");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<Sector>(SECTOR_VIEWS.molo_district);
  const [showSim, setShowSim] = useState(false);

  const { role } = useAuth();
  const allReports = useQuery(api.reports.getAllReports);

  const verifiedHotspots = allReports?.filter(r => 
  r.verified && r.status !== "Completed"
   ) || [];

  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'brgy-calumpang') setCurrentView(SECTOR_VIEWS.calumpang);
    if (role === 'brgy-sanjuan') setCurrentView(SECTOR_VIEWS.san_juan);
    if (role === 'brgy-southfundidor') setCurrentView(SECTOR_VIEWS.south_fundidor);
  }, [role]);

  const getImageUrl = (report: any) => {
    if (!report) return "";
    const img = report.processedImage || report.imageUri;
    if (img?.startsWith("http") || img?.startsWith("data:")) return img;
    return `data:image/jpeg;base64,${img}`;
  };

  return (
    <>
      {/* ── Simulation Overlay ── */}
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

      <div className="h-full w-full relative overflow-hidden bg-slate-100 animate-in fade-in duration-500 rounded-2xl border border-slate-200 shadow-sm flex">
        <div className="flex-1 relative">
          <MapContainer
            center={currentView.center}
            zoom={currentView.zoom}
            className="w-full h-full z-0"
            zoomControl={false}
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

            <MapUpdater center={currentView.center} zoom={currentView.zoom} />

            {verifiedHotspots.map((report) => (
              <CircleMarker
                key={report._id}
                center={[report.lat, report.lng] as LatLngTuple}
                radius={9}
                pathOptions={{
                  color: "white",
                  fillColor: report.status === 'CRITICAL' ? '#ef4444' : '#fbbf24',
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={{ click: () => setSelectedHotspotId(report._id) }}
                className="cursor-pointer"
              >
                <CircleMarker
                  center={[report.lat, report.lng] as LatLngTuple}
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

          {/* Labels Overlay */}
          <div className="absolute top-6 left-6 z-[400] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-5 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl font-black text-slate-900 tracking-tighter">Live Risk Map</h2>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{verifiedHotspots.length} Verified Hotspots Found</p>
            </div>
          </div>

          {/* ── Enter Simulation Field Button ── */}
          <div className="absolute top-6 right-6 z-[400]">
            <button
              onClick={() => setShowSim(true)}
              className="group flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/40 border border-white/10 transition-all active:scale-95 hover:shadow-cyan-900/30"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <FlaskConical size={14} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">Enter Simulation Field</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">ABM Mosquito Spread Model</p>
              </div>
            </button>
          </div>

          {/* Map Type Toggle */}
          <div className="absolute bottom-6 left-6 z-[400] bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/20 flex gap-1">
            <button onClick={() => setMapType("street")} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl transition-all ${mapType === "street" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}>Street</button>
            <button onClick={() => setMapType("satellite")} className={`px-4 py-2 font-black text-[10px] uppercase rounded-xl transition-all flex items-center gap-1.5 ${mapType === "satellite" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}><Layers size={14} /> Satellite</button>
          </div>

          {/* Popup Logic */}
          {selectedHotspotId && (() => {
            const data = verifiedHotspots.find(h => h._id === selectedHotspotId);
            if (!data) return null;
            return (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-auto bg-white rounded-3xl shadow-2xl overflow-hidden w-[320px] border border-slate-100 z-[500] animate-in zoom-in-95 duration-300">
                <div className="w-full h-[160px] bg-slate-900 relative">
                  <img src={getImageUrl(data)} alt="Evidence" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded bg-white/90 backdrop-blur shadow-sm uppercase ${data.status === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {data.status}
                    </span>
                    <span className="text-[9px] font-black px-2 py-1 rounded bg-emerald-500 text-white shadow-sm flex items-center gap-1 uppercase">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  </div>
                  <button onClick={() => setSelectedHotspotId(null)} className="absolute top-4 right-4 w-7 h-7 bg-black/20 hover:bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white text-xs transition-colors">✕</button>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-slate-900 text-lg leading-tight truncate">{data.locationName}</h3>
                    <div className="flex items-center gap-1 text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">
                      <Zap size={12} fill="currentColor" />
                      <span className="text-[10px] font-black">{data.accuracy}%</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-start gap-2 text-xs text-slate-500 font-bold uppercase tracking-tight">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span>{data.lat.toFixed(4)}, {data.lng.toFixed(4)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1 flex items-center gap-1">
                        <BarChart3 size={10} /> AI Reasoning
                      </p>
                      <p className="text-[11px] text-slate-700 font-medium italic line-clamp-2">"{data.reasoning}"</p>
                    </div>
                  </div>

                  <button onClick={() => navigate(`/assignments?reportId=${data._id}`)} className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95">
                    Assign Tanod Team
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Sidebar */}
        <div className="w-[360px] bg-white border-l border-slate-100 flex flex-col z-[400]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h3 className="font-black text-2xl text-slate-900 tracking-tighter flex items-center gap-2 mb-6">
              <Crosshair size={22} className="text-primary-600" /> Control
            </h3>

            <div className="relative">
              <select
                className="w-full bg-white pl-4 pr-10 py-4 rounded-2xl shadow-sm border border-slate-200 text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary-500/20"
                onChange={(e) => setCurrentView(SECTOR_VIEWS[e.target.value])}
              >
                {Object.entries(SECTOR_VIEWS).map(([key, sector]) => (
                  <option key={key} value={key}>{sector.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Unverified Field Reports</h4>
            <div className="space-y-4">
              {allReports?.filter(r => !r.verified).map((rpt: any) => (
                <div key={rpt._id} className="group p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary-200 hover:bg-white transition-all cursor-pointer shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${rpt.status === 'CRITICAL' ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'}`}>
                      {rpt.status}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Awaiting Review</span>
                  </div>
                  <p className="font-black text-slate-800 text-sm mb-1 line-clamp-1">{rpt.locationName}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 opacity-70">
                    <MapPin size={10} /> {rpt.lat.toFixed(3)}, {rpt.lng.toFixed(3)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}