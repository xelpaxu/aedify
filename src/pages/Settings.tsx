import React, { useState } from "react";
import { Save, AlertCircle, Cpu, Wifi, Map as MapIcon, RefreshCw, SlidersHorizontal } from "lucide-react";

export default function Settings() {
  const [w1, setW1] = useState(0.4);
  const [w2, setW2] = useState(0.8);
  const [w3, setW3] = useState(0.6);
  const [weatherApi, setWeatherApi] = useState(true);
  const [gisApi, setGisApi] = useState(true);

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-5xl mx-auto w-full pt-2 pb-8">
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div>
           <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">System Tuning</h2>
           <p className="text-sm font-medium text-slate-500">Adjust Agent-Based Modeling parameters and integrations</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] transition-all duration-300 font-bold active:scale-95 group">
           <Save size={18} className="group-hover:-translate-y-0.5 transition-transform" /> Save Config
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* System Configuration */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md ring-2 ring-slate-200">
                <Cpu size={18} />
             </div>
             <h3 className="text-xl font-bold text-slate-800">Core Configuration</h3>
          </div>
          
          <div className="glass p-7 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-64 h-64 bg-slate-200/50 rounded-full blur-[60px] -ml-20 -mt-20 group-hover:bg-primary-100/30 transition-colors duration-700 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                    <Wifi size={18} />
                 </div>
                 <div>
                   <p className="font-extrabold text-slate-800 text-base mb-0.5">Atmospheric Link (PAGASA)</p>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Met Station WebSocket</p>
                 </div>
              </div>
              <button 
                 onClick={() => setWeatherApi(!weatherApi)}
                 className={`w-14 h-7 rounded-full relative transition-colors duration-300 shadow-inner ${weatherApi ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                 <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 ${weatherApi ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-slate-200/60 w-full relative z-10" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                    <MapIcon size={18} />
                 </div>
                 <div>
                   <p className="font-extrabold text-slate-800 text-base mb-0.5">City GIS Infrastructure</p>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Drainage & Terrain Topo</p>
                 </div>
              </div>
              <button 
                 onClick={() => setGisApi(!gisApi)}
                 className={`w-14 h-7 rounded-full relative transition-colors duration-300 shadow-inner ${gisApi ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                 <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 ${gisApi ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-slate-200/60 w-full relative z-10" />

            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-3">
                  <RefreshCw size={16} className="text-slate-400" />
                  <p className="font-bold text-slate-800 text-sm">Main Cycle Refresh Rate</p>
               </div>
               <select className="w-full glass bg-white/60 text-sm font-bold text-slate-700 px-4 py-3 border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 rounded-xl cursor-pointer">
                  <option value="5">Aggressive (Every 5 minutes)</option>
                  <option value="15">Balanced (Every 15 minutes)</option>
                  <option value="60">Passive (Every hour)</option>
               </select>
            </div>
          </div>
        </div>

        {/* Threshold Tuning */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-lg shadow-sm border border-primary-200/50">
                   <SlidersHorizontal size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">ABM Constants</h3>
             </div>
             <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200/50">
                Live Re-calc
             </span>
          </div>

          <div className="glass p-7 space-y-8 relative overflow-hidden group h-[calc(100%-3rem)]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-[60px] -mr-20 -mt-20 group-hover:bg-amber-400/10 transition-colors duration-700 pointer-events-none" />

            <div className="p-4 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-200/40 flex items-start gap-3 shadow-sm relative z-10">
               <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
               <p className="text-xs font-bold text-amber-900/80 leading-relaxed">
                 Modifying these weights triggers immediate recalibration of the Spatiotemporal Engine's localized heatmaps.
               </p>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <label className="text-slate-700 font-extrabold text-sm">$W_1$ (Environment Sensitivity)</label>
                <div className="glass-panel px-3 py-1 bg-white font-mono text-sm font-bold text-primary-600 shadow-sm border-slate-100 min-w-[60px] text-center">
                   {w1.toFixed(2)}
                </div>
              </div>
              <input
                type="range" min="0" max="1" step="0.05" value={w1} onChange={(e) => setW1(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600 hover:accent-primary-500 transition-all"
              />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <label className="text-slate-700 font-extrabold text-sm">$W_2$ (AI Confidence Baseline)</label>
                <div className="glass-panel px-3 py-1 bg-white font-mono text-sm font-bold text-primary-600 shadow-sm border-slate-100 min-w-[60px] text-center">
                   {w2.toFixed(2)}
                </div>
              </div>
              <input
                type="range" min="0" max="1" step="0.05" value={w2} onChange={(e) => setW2(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600 hover:accent-primary-500 transition-all"
              />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <label className="text-slate-700 font-extrabold text-sm">$W_3$ (Migration Dispersal Rate)</label>
                <div className="glass-panel px-3 py-1 bg-white font-mono text-sm font-bold text-primary-600 shadow-sm border-slate-100 min-w-[60px] text-center">
                   {w3.toFixed(2)}
                </div>
              </div>
              <input
                type="range" min="0" max="1" step="0.05" value={w3} onChange={(e) => setW3(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600 hover:accent-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
