import React, { useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Search, Activity, CheckCircle2, MapPin, Layers, Crosshair, PlusCircle } from "lucide-react";

export default function RiskMap() {
  const [mapType, setMapType] = useState<"street" | "satellite">("street");
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
  
  const hotspots = [
    { id: 1, lat: 14.6050, lng: 120.9890, status: "High Risk", reportId: "Report #8293", updated: "2 hours ago", loc: "Corner of Mabini & Rizal St.", site: "Tires", color: "#ef4444" },
    { id: 2, lat: 14.64, lng: 120.94, status: "Warning", reportId: "Report #1024", updated: "5 hours ago", loc: "Quezon Memorial Area", site: "Stagnant Pool", color: "#fbbf24" },
    { id: 3, lat: 14.54, lng: 120.92, status: "Nominal", reportId: "Report #0932", updated: "1 day ago", loc: "Pasay City Hall", site: "Clearing Ops", color: "#10b981" },
  ];

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-100 animate-in fade-in duration-500 rounded-2xl border border-slate-200 shadow-sm flex">
      {/* Background Map Container */}
      <div className="flex-1 relative">
        <MapContainer center={[14.6091, 120.9822]} zoom={12} className="w-full h-full z-0" zoomControl={false}>
          {mapType === "street" ? (
             <TileLayer
               attribution='&copy; <a href="https://stadiamaps.com/">Stadia</a>'
               url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
             />
          ) : (
             <TileLayer
               attribution='&copy; Esri'
               url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
             />
          )}

          {hotspots.map((point) => (
             <CircleMarker 
                key={point.id}
                center={[point.lat, point.lng]} 
                radius={8} 
                pathOptions={{ color: "white", fillColor: point.color, fillOpacity: 1, weight: 2 }}
                eventHandlers={{ click: () => setSelectedHotspot(point.id) }}
                className="cursor-pointer"
             >
                {point.status === "Warning" && (
                   <CircleMarker center={[point.lat, point.lng]} radius={16} pathOptions={{ color: "none", fillColor: point.color, fillOpacity: 0.3 }} />
                )}
             </CircleMarker>
          ))}
        </MapContainer>

        {/* Map Control Floating Toggle layer */}
        <div className="absolute bottom-6 left-6 z-[400] glass-panel bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-100 flex gap-1">
           <button 
              onClick={() => setMapType("street")}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-colors ${mapType === "street" ? "bg-primary-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
           >
              Vector Map
           </button>
           <button 
              onClick={() => setMapType("satellite")}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 ${mapType === "satellite" ? "bg-primary-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
           >
              <Layers size={14} /> Satellite
           </button>
        </div>

        {/* Top Floating Tools */}
        <div className="absolute top-6 left-6 pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-5 border border-slate-100 max-w-sm z-[400]">
           <h2 className="text-xl font-black text-slate-900 mb-1">Geospatial Intelligence</h2>
           <p className="text-xs font-bold text-slate-500">Live reporting and active deployment overview</p>
        </div>

        {/* Central Detached Popup Element (Only shown if a hotspot is selected) */}
        {selectedHotspot && (() => {
           const data = hotspots.find(h => h.id === selectedHotspot);
           if (!data) return null;
           return (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-auto bg-white rounded-2xl shadow-2xl overflow-hidden w-[300px] border border-slate-100 z-[500] animate-in zoom-in-95 duration-200">
                <div className="w-full h-[120px] bg-slate-200 relative overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1579781358055-6b5cfdff00ff?auto=format&fit=crop&q=80&w=400" alt="stagnant water" className="w-full h-full object-cover" />
                   <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-sm border border-white/20">
                      {data.status}
                   </span>
                   <button onClick={() => setSelectedHotspot(null)} className="absolute top-3 right-3 w-6 h-6 bg-white/50 hover:bg-white rounded-full flex items-center justify-center font-bold text-slate-800 backdrop-blur shadow-sm transition-colors text-xs">
                      ✕
                   </button>
                </div>
                <div className="p-5">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h3 className="font-extrabold text-slate-900 text-base leading-none mb-1">{data.reportId}</h3>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Updated {data.updated}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                         <CheckCircle2 size={10} /> Verified
                      </div>
                   </div>
     
                   <div className="space-y-2.5 mb-5">
                      <p className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                         <MapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
                         {data.loc}
                      </p>
                      <p className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                         <Activity size={14} className="text-primary-500 mt-0.5 shrink-0" />
                         Breeding Site: {data.site}
                      </p>
                   </div>
     
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Actions</h4>
                   <div className="flex flex-col gap-2">
                       <button className="w-full bg-slate-50 border border-slate-200 hover:border-primary-400 text-slate-700 hover:text-primary-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                          <PlusCircle size={14} /> Assign Report to Unit
                       </button>
                       <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors">
                          View Deep Analysis
                       </button>
                   </div>
                </div>
             </div>
           );
        })()}
      </div>

      {/* Right Tools Sidebar (Map Extension) */}
      <div className="w-[340px] bg-white border-l border-slate-200 shadow-xl flex flex-col z-[400] relative">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-extrabold text-lg text-slate-900 mb-4 flex items-center gap-2">
               <Crosshair size={18} className="text-primary-600" /> Command Module
            </h3>
            <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input type="text" placeholder="Locate sector..." className="w-full bg-white pl-10 pr-4 py-3 rounded-xl shadow-sm border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 placeholder:text-slate-400" />
            </div>
         </div>
         
         <div className="flex-1 p-6 overflow-y-auto bg-white">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Unassigned Reports Queue</h4>
            
            <div className="space-y-3">
               {[1, 2, 3].map((_, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-4 hover:bg-primary-50/50 hover:border-primary-200 transition-colors cursor-pointer group">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">Unassigned</span>
                        <span className="text-[10px] font-bold text-slate-400">#RP-100{i}</span>
                     </div>
                     <p className="font-bold text-slate-800 text-sm mb-1 group-hover:text-primary-700 transition-colors">Stagnant Canal Blockage</p>
                     <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><MapPin size={12}/> Lapaz Market Vicinity</p>
                     <div className="mt-3 flex justify-end">
                        <button className="text-xs font-bold text-primary-600 hover:text-white hover:bg-primary-600 px-3 py-1.5 rounded bg-primary-50 transition-colors border border-primary-100">
                           Dispatch
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}