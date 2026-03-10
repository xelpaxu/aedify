import React, { useState } from "react";
import { mockReports } from "../mockData";
import { Share2, Printer, MapPin, Bot, Check, X, ShieldAlert } from "lucide-react";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<typeof mockReports[0] | null>(mockReports[0]);

  return (
    <div className="h-full flex gap-6 bg-transparent animate-in fade-in duration-500 max-w-[1600px] w-full mx-auto pb-6">
      {/* Sidebar List */}
      <div className="w-[420px] bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-200 flex flex-col shrink-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/50 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none" />
        
        <div className="p-6 pb-4 border-b border-slate-100/60 bg-white/50 relative z-10 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Incoming Feeds</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Verification protocols</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 custom-scrollbar pr-2">
          {mockReports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`p-5 rounded-2xl cursor-pointer transition-all border-2 bg-white flex flex-col gap-4 shadow-sm group hover:-translate-y-0.5 ${
                selectedReport?.id === report.id
                  ? "border-primary-500 ring-2 ring-primary-500/20"
                  : "border-transparent hover:border-primary-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-black px-2.5 py-1 rounded shadow-sm uppercase tracking-widest ${
                   selectedReport?.id === report.id ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {report.id}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{report.timeAgo}</span>
              </div>
              
              <h3 className="font-black text-slate-800 text-base leading-tight group-hover:text-primary-700 transition-colors">{report.title}</h3>
              
              <div className="flex items-end justify-between mt-1">
                 <div className="flex gap-6">
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risk</p>
                       <p className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide">
                          <span className={`w-1.5 h-1.5 rounded-full ${report.risk === 'High' ? 'bg-rose-500' : report.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className={report.risk === 'High' ? 'text-rose-600' : report.risk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}>{report.risk}</span>
                       </p>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                       <p className="text-xs font-black text-slate-700">{report.confidence}</p>
                    </div>
                 </div>
                 
                 {selectedReport?.id === report.id ? (
                    <button className="bg-primary-50 border border-primary-200 text-primary-700 text-[10px] uppercase font-black px-4 py-2 rounded-lg">
                       Active
                    </button>
                 ) : (
                    <button className="text-[10px] uppercase font-black text-slate-400 hover:text-primary-600 transition-colors bg-slate-50 border border-slate-100 px-4 py-2 rounded-lg hover:border-primary-200">
                       Select
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative custom-scrollbar">
        {selectedReport ? (
          <div className="p-8 pb-12 w-full max-w-4xl mx-auto min-h-full">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest ${selectedReport.status === 'OPEN' ? 'bg-rose-50 border border-rose-200/50 text-rose-600' : 'bg-emerald-50 border border-emerald-200/50 text-emerald-600'}`}>
                    {selectedReport.status}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">REF: {selectedReport.id}</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{selectedReport.title}</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block">{selectedReport.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"><Printer size={18} /></button>
                <button className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"><Share2 size={18} /></button>
              </div>
            </div>

            {/* Huge Image Container */}
            <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl border-4 border-white bg-slate-900 group">
              <img src={selectedReport.rawPhoto} alt="Evidence" className="w-full h-[400px] object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              
              {/* Fake Bounding Box */}
              <div className="absolute top-1/4 left-1/4 w-1/3 h-[40%] border-[3px] border-primary-500 bg-primary-500/20 rounded shadow-[0_0_12px_rgba(8,145,178,0.5)]">
                 <div className="absolute -top-3 left-4 bg-primary-600 text-white shadow-md text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-sm whitespace-nowrap flex items-center gap-1.5">
                   {selectedReport.classification} <span className="text-primary-200">|</span> {selectedReport.confidence}
                 </div>
              </div>

              <div className="absolute bottom-5 left-6 flex items-center gap-3">
                 <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/50 text-rose-400 animate-pulse">
                    <ShieldAlert size={16} />
                 </span>
                 <div>
                    <p className="text-white text-sm font-black leading-none uppercase tracking-wide">Threat Detected</p>
                    <p className="text-slate-300 text-[10px] font-medium tracking-wider">Visual telemetry stream preserved</p>
                 </div>
              </div>

              <div className="absolute bottom-5 right-6 bg-white/10 backdrop-blur-lg border border-white/20 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                 <Check size={14} className="text-primary-400" /> Ground Truth Source
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-2 gap-8 mb-10">
               {/* Location Panel */}
               <div className="glass rounded-3xl border border-slate-200 p-6 shadow-sm bg-white hover:border-primary-200 transition-colors">
                 <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-wider">
                       <MapPin size={16} className="text-primary-600" /> Positional Data
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded shadow-inner uppercase tracking-widest border border-slate-100">
                      GPS Sync
                    </span>
                 </div>
                 {/* Map Placeholder Graphic */}
                 <div className="w-full h-36 rounded-2xl bg-slate-100 mb-4 overflow-hidden relative border border-slate-200 shadow-inner">
                    <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover opacity-80" alt="map" />
                    <div className="absolute inset-0 bg-primary-500/10 mix-blend-color" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-primary-600 border border-primary-50 animate-bounce">
                       <MapPin size={20} className="fill-primary-50" />
                    </div>
                 </div>
                 <h4 className="font-extrabold text-slate-800 text-sm mb-1">{selectedReport.location}</h4>
                 <p className="text-[11px] font-mono text-slate-500 font-bold bg-slate-50 p-2 rounded-lg inline-block border border-slate-100">
                    LAT: {selectedReport.coordinates[0]} <span className="text-slate-300 px-1">|</span> LNG: {selectedReport.coordinates[1]}
                 </p>
               </div>

               {/* AI Analysis Panel */}
               <div className="glass rounded-3xl border border-slate-200 p-6 shadow-sm bg-white hover:border-primary-200 transition-colors flex flex-col">
                 <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-wider">
                       <Bot size={16} className="text-primary-600" /> Core Engine
                    </div>
                    <span className="text-[9px] font-black text-white bg-primary-600 px-3 py-1 rounded shadow-sm shadow-primary-500/30 uppercase tracking-widest border border-primary-700">
                      YOLOv8 Active
                    </span>
                 </div>

                 <div className="flex-1 space-y-6">
                    <div>
                        <div className="flex items-end justify-between mb-2">
                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Calculated Confidence</span>
                           <span className="font-black text-slate-900 border-b-2 border-primary-500">{selectedReport.confidence}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                           <div className="h-full bg-primary-500 rounded-full relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                           </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Severity Eval</p>
                          <p className="font-black text-xl text-rose-600 uppercase tracking-wider">{selectedReport.risk}</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Target Objects</p>
                          <p className="font-black text-xl text-slate-800 uppercase tracking-wider">{selectedReport.objectsCount}</p>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200/60 pt-8 pb-4">
               <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-6 bg-primary-500 rounded-full" />
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">Authorization Pipeline</h3>
               </div>
               
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner mb-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Field Deployment Notes</label>
                  <textarea 
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 resize-none shadow-sm placeholder:text-slate-300 transition-all custom-scrollbar"
                     rows={3}
                     placeholder="Enter tactical remarks..."
                  ></textarea>
               </div>
               
               <div className="flex gap-4">
                  <button className="flex-1 py-4 px-6 rounded-2xl bg-white border border-rose-200 text-rose-600 font-black flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 shadow-sm transition-all focus:ring-4 focus:ring-rose-500/10 uppercase tracking-wider text-sm active:scale-95">
                     <X size={18} strokeWidth={3} /> Mark False Positive
                  </button>
                  <button className="w-[60%] py-4 px-6 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(8,145,178,0.3)] transition-all focus:ring-4 focus:ring-primary-500/20 uppercase tracking-wider text-sm active:scale-95 border border-primary-500">
                     <Check size={18} strokeWidth={3} /> Authorize Deployment
                  </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col border border-slate-100 items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl m-4 border-dashed">
            <Bot size={48} className="text-slate-200 mb-4" />
            <p className="font-bold text-sm uppercase tracking-widest">Select stream to view telemetry</p>
          </div>
        )}
      </div>
    </div>
  );
}
