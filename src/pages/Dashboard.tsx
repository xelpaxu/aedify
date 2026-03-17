import React from "react";
import { MetricCard } from "../components/MetricCard";
import { MapPin, Target, AlertTriangle, Radar, ListFilter, Map as MapIcon, ShieldAlert, Navigation } from "lucide-react";
import { mockDashboardActivities, mockReports, mockAssignments } from "../mockData";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../App";

// Utility component to update map view dynamically
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function Dashboard() {
  const { role } = useAuth();

  let center: [number, number] = [10.6953, 122.5447]; // Default Molo
  let zoomLevel = 13;

  if (role === 'brgy-calumpang') { center = [10.6975, 122.5367]; zoomLevel = 15; }
  if (role === 'brgy-sanjuan') { center = [10.6860, 122.5404]; zoomLevel = 15; }
  if (role === 'brgy-southfundidor') { center = [10.6883, 122.5312]; zoomLevel = 15; }

  const openReports = mockReports.filter((r) => r.status === "OPEN");
  const activeHotspots = openReports.length;
  const personnelAssigned = new Set(
    mockAssignments
      .filter((a) => a.assignee)
      .map((a) => a.assignee!.name)
  ).size;

  const topRiskReport = openReports.find((r) => r.risk === "High") ?? openReports[0];
  const riskUpdateTitle = topRiskReport
    ? `Elevated risk in ${topRiskReport.location}`
    : "All sectors stable";
  const riskUpdateSubtitle = topRiskReport
    ? `Detected ${topRiskReport.classification.toLowerCase()} ${topRiskReport.timeAgo}.`
    : "No open incidents currently.";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-[1600px] w-full mx-auto pb-8 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Surveillance Overview</h2>
        <div className="glass-panel px-4 py-2 flex items-center gap-2 shadow-sm rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-700">Live Sec: {role?.startsWith('brgy') ? 'Barangay Local' : 'Molo Sector'}</span>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Active Hotspots"
          value={String(activeHotspots)}
          subtitle="Requiring immediate action"
          icon={<AlertTriangle size={24} strokeWidth={2.5} />}
          trend={activeHotspots > 0 ? `+${activeHotspots}%` : "0%"}
          trendUp={activeHotspots > 0}
        />
        <MetricCard
          title="Field Personnel"
          value={String(personnelAssigned)}
          subtitle="Active deployment units"
          icon={<Target size={24} strokeWidth={2.5} />}
        />
        <div className="col-span-1 md:col-span-2 glass-panel p-6 flex flex-col justify-between overflow-hidden relative group border border-primary-200 shadow-sm bg-gradient-to-br from-white to-primary-50">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-400/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none group-hover:bg-primary-500/20 transition-all duration-700" />
          <div className="flex items-start justify-between relative z-10 mb-2">
            <span className="text-sm font-bold text-slate-500">Risk Update</span>
          </div>
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none">{riskUpdateTitle}</p>
              <p className="text-sm font-bold text-slate-500 mt-2">{riskUpdateSubtitle}</p>
            </div>
            <button className="bg-primary-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(8,145,178,0.3)] hover:bg-primary-700 transition-colors">
              Execute Protocols
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[500px]">
        {/* Live Minimap Block */}
        <div className="xl:col-span-2 glass overflow-hidden flex flex-col relative border border-white shadow-xl rounded-3xl group">
          <div className="absolute top-4 left-4 z-[400] glass-panel bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-100 shadow-lg">
            <Navigation size={18} className="text-primary-600 animate-pulse" />
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global Scan</h3>
              <p className="text-[10px] font-bold text-slate-500">Real-time geospatial matrix</p>
            </div>
          </div>

          <MapContainer center={center} zoom={zoomLevel} className="w-full h-full z-0" zoomControl={false}>
            <TileLayer
               attribution='&copy; <a href="https://stadiamaps.com/">Stadia</a>'
               url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            />
            <MapUpdater center={center} zoom={zoomLevel} />
            {mockReports.map(m => (
               <CircleMarker 
                  key={m.id} 
                  center={[m.coordinates[0], m.coordinates[1]]} 
                  radius={6} 
                  pathOptions={{ color: "white", fillColor: m.risk === 'High' ? "#ef4444" : m.risk === 'Medium' ? "#fbbf24" : "#10b981", fillOpacity: 0.9, weight: 2 }} 
                  className={m.risk === 'High' ? "animate-pulse" : ""} 
               />
            ))}
          </MapContainer>

          <div className="absolute bottom-4 right-4 z-[400] glass p-1.5 flex flex-col gap-1.5 shadow-lg border border-slate-200">
            <button className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-md font-bold text-lg leading-none shadow-sm transition-colors">+</button>
            <button className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-md font-bold text-lg leading-none shadow-sm transition-colors">-</button>
          </div>
        </div>

        {/* Right Sidebar Activity */}
        <div className="glass p-6 relative overflow-hidden flex flex-col border border-white rounded-3xl bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Active Stream</h3>
              <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Live Updates</p>
            </div>
            <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors">
              <ListFilter size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 pr-1 custom-scrollbar">
            {mockDashboardActivities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex gap-4 p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all duration-300 border border-slate-100 shadow-sm group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative shadow-inner border border-slate-200/50">
                  <img src={activity.thumbnail} alt={activity.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-extrabold text-slate-800 truncate group-hover:text-primary-600 transition-colors mb-0.5">{activity.title}</h4>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2"><MapPin size={12} /> {activity.location}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md text-white shadow-sm
                         ${activity.severity === 'High' ? 'bg-rose-500' : activity.severity === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                      {activity.severity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
