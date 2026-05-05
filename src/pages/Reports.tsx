import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Share2, Printer, MapPin, Bot, Check, X, 
  Activity, Maximize2, Search, Zap, Image as ImageIcon 
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet marker fix
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(coords, 16); }, [coords, map]);
  return null;
}

export default function Reports() {
  const reports = useQuery(api.reports.getAllReports);
  const verify = useMutation(api.reports.verifyReport);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"annotated" | "raw">("annotated");

  useEffect(() => {
    if (reports && reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  // ─── SIMPLIFIED IMAGE FORMATTER ──────────────────────────────
  const getDisplayImage = (report: any, mode: "annotated" | "raw") => {
    if (!report) return "";
    
    const targetString = (mode === "annotated" && report.processedImage) 
      ? report.processedImage 
      : report.imageUri;

    if (!targetString) return "";

    // If it's a permanent Convex URL, return as is
    if (targetString.startsWith("http")) return targetString;

    // If it's Base64 from the mobile app, ensure the prefix exists
    return targetString.startsWith("data:") 
      ? targetString 
      : `data:image/jpeg;base64,${targetString}`;
  };

  if (reports === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-white/50 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <Bot size={48} className="text-primary-500 animate-pulse" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Initialising Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6 bg-transparent animate-in fade-in duration-500 max-w-[1600px] w-full mx-auto pb-6 relative">
      
      {/* --- FULLSCREEN INSPECTION MODAL --- */}
      {isPreviewOpen && selectedReport && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-12 animate-in fade-in zoom-in duration-300"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
            <X size={32} strokeWidth={3} />
          </button>
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getDisplayImage(selectedReport, viewMode)} 
              className="max-h-[85vh] w-auto rounded-xl shadow-2xl border border-white/10 object-contain"
              alt="High Res Evidence"
            />
            <div className="text-center">
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">{selectedReport.locationName}</h3>
              <p className="text-primary-400 font-bold text-sm uppercase tracking-widest">
                {viewMode === "annotated" ? "AI Computer Vision Analysis" : "Raw Sensor Data"} • {selectedReport.accuracy}% Confidence
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Incoming Feeds */}
      <div className="w-[420px] bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 flex flex-col shrink-0 overflow-hidden relative">
        <div className="p-6 pb-4 border-b border-slate-100/60 bg-white/50 z-10 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Incoming Feeds</h2>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-primary-500" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {reports.length} Reports Logged
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar pr-2">
          {reports.map((report) => (
            <div
              key={report._id}
              onClick={() => setSelectedReport(report)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border-2 bg-white flex flex-col gap-3 group ${
                selectedReport?._id === report._id 
                ? "border-primary-500 ring-4 ring-primary-500/5 shadow-md" 
                : "border-transparent hover:border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  report.status === 'CRITICAL' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {report.status}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(report._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="font-black text-sm text-slate-800 leading-tight line-clamp-1">{report.locationName}</h3>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${report.verified ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Conf: {report.accuracy}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm relative custom-scrollbar">
        {selectedReport ? (
          <div className="p-8 pb-12 w-full max-w-4xl mx-auto min-h-full">
            
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border mb-3 inline-block uppercase tracking-widest ${
                  selectedReport.status === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
                  {selectedReport.status}
                </span>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{selectedReport.locationName}</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block"> Reporter: {selectedReport.userName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-all"><Printer size={18} /></button>
                <button className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-all"><Share2 size={18} /></button>
              </div>
            </div>

            {/* Evidence Image Section with Mode Toggle */}
            <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl border-4 border-white bg-slate-900 group">
              
              <div className="absolute top-6 right-6 z-20 flex bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-2xl">
                <button 
                  onClick={() => setViewMode("annotated")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                    viewMode === "annotated" ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap size={12} /> ANNOTATED
                </button>
                <button 
                  onClick={() => setViewMode("raw")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                    viewMode === "raw" ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon size={12} /> RAW
                </button>
              </div>

              <div 
                className="cursor-zoom-in relative"
                onClick={() => setIsPreviewOpen(true)}
              >
                <img 
                  key={`${viewMode}-${selectedReport._id}`}
                  src={getDisplayImage(selectedReport, viewMode)} 
                  alt="Evidence" 
                  className="w-full h-[500px] object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-700" 
                />
                
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                   <div className="bg-white/20 backdrop-blur-xl p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-2xl border border-white/30">
                      <Search size={32} className="text-white" />
                   </div>
                </div>

                <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                   <div className="bg-white/10 p-1.5 rounded-lg">
                      <Maximize2 size={16} className="text-white" />
                   </div>
                   <p className="text-white text-[10px] font-black uppercase tracking-[0.1em]">
                     Mode: {viewMode === 'annotated' ? 'AI Overlay Active' : 'Sensor Source'}
                   </p>
                </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="glass rounded-3xl border border-slate-200 p-6 shadow-sm bg-white">
                  <div className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-wider mb-5">
                     <MapPin size={16} className="text-primary-600" /> Geospatial Lock
                  </div>
                  <div className="w-full h-52 rounded-2xl mb-4 overflow-hidden border border-slate-100 shadow-inner">
                     <MapContainer center={[selectedReport.lat, selectedReport.lng]} zoom={16} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                       <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                       <Marker position={[selectedReport.lat, selectedReport.lng]} icon={DefaultIcon} />
                       <RecenterMap coords={[selectedReport.lat, selectedReport.lng]} />
                     </MapContainer>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[11px] font-bold text-slate-700">
                     {selectedReport.lat.toFixed(6)}, {selectedReport.lng.toFixed(6)}
                  </div>
                </div>

                <div className="glass rounded-3xl border border-slate-200 p-6 shadow-sm bg-white flex flex-col">
                  <div className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-wider mb-8">
                     <Bot size={16} className="text-primary-600" /> AI Diagnostic
                  </div>
                  <div className="flex-1 space-y-6">
                     <div>
                         <div className="flex items-end justify-between mb-2 text-[10px] uppercase font-bold text-slate-400">
                            <span>Confidence Score</span>
                            <span className="text-slate-900 border-b-2 border-primary-500 font-black">{selectedReport.accuracy}%</span>
                         </div>
                         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: `${selectedReport.accuracy}%` }}></div>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                            <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Status</p>
                            <p className={`font-black text-xs ${selectedReport.status === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-600'}`}>{selectedReport.status}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                            <p className="text-[9px] uppercase font-black text-slate-400 mb-1">Verified</p>
                            <p className="font-black text-xs text-slate-800">{selectedReport.verified ? "YES" : "NO"}</p>
                        </div>
                     </div>
                     <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                       <p className="text-[10px] font-black text-primary-400 uppercase mb-2">Reporter Description</p>
                       <p className="text-white text-[11px] font-medium italic line-clamp-3">"{selectedReport.description}"</p>
                     </div>
                  </div>
                </div>
            </div>

            {/* AI Reasoning Section */}
            <div className="mb-10 bg-primary-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                <Bot size={140} className="absolute -right-8 -bottom-8 opacity-10 rotate-12 transition-transform group-hover:scale-110 duration-700" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 opacity-80 flex items-center gap-2">
                   <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                   Neural Vision Reasoning
                </h4>
                <p className="text-xl font-bold leading-relaxed relative z-10 italic">
                  "{selectedReport.reasoning}"
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
                <button className="flex-1 py-4 px-6 rounded-2xl bg-white border border-rose-200 text-rose-600 font-black flex items-center justify-center gap-2 hover:bg-rose-50 transition-all uppercase tracking-wider text-sm">
                    <X size={18} strokeWidth={3} /> Dismiss
                </button>
                <button 
                  disabled={selectedReport.verified}
                  onClick={async () => {
                     try {
                        await verify({ id: selectedReport._id });
                     } catch (error) {
                        console.error("Verification failed:", error);
                     }
                  }} 
                  className={`w-[60%] py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider text-sm ${
                     selectedReport.verified 
                        ? "bg-emerald-500 text-white cursor-default shadow-emerald-200/50" 
                        : "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200/50"
                  }`}
                  >
                  {selectedReport.verified ? (
                     <>
                        <Check size={18} strokeWidth={3} /> Report Verified
                     </>
                  ) : (
                     <>
                        <Zap size={18} strokeWidth={3} /> Verify Report
                     </>
                  )}
               </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl m-4 border-2 border-dashed border-slate-200">
            <Bot size={48} className="text-slate-200 mb-4" />
            <p className="font-bold text-sm uppercase tracking-widest">Select stream to view telemetry</p>
          </div>
        )}
      </div>
    </div>
  );
}