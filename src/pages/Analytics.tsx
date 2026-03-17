import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar } from "recharts";
import { Sparkles, TrendingUp, Activity, Users } from "lucide-react";
import { mockAssignments } from "../mockData";

const accuracyData = [
  { day: "Mon", mobileNet: 78, yolo: 85 },
  { day: "Tue", mobileNet: 80, yolo: 88 },
  { day: "Wed", mobileNet: 79, yolo: 91 },
  { day: "Thu", mobileNet: 81, yolo: 89 },
  { day: "Fri", mobileNet: 82, yolo: 93 },
  { day: "Sat", mobileNet: 84, yolo: 94 },
  { day: "Sun", mobileNet: 83, yolo: 95 },
];

const barangayActions = Object.values(
  mockAssignments.reduce((acc, curr) => {
    const key = curr.assignee?.team ?? "Unassigned";
    if (!acc[key]) {
      acc[key] = { name: key, cleared: 0, pending: 0 };
    }

    if (curr.status === "Completed") {
      acc[key].cleared += 1;
    } else {
      acc[key].pending += 1;
    }

    return acc;
  }, {} as Record<string, { name: string; cleared: number; pending: number }>)
);

const simulationData = [
  { time: "Day 1", riskLevel: 20, mosquitoPop: 300 },
  { time: "Day 3", riskLevel: 35, mosquitoPop: 450 },
  { time: "Day 5", riskLevel: 50, mosquitoPop: 800 },
  { time: "Day 7", riskLevel: 80, mosquitoPop: 1500 },
  { time: "Day 10", riskLevel: 95, mosquitoPop: 2400 },
];

export default function Analytics() {
  const [filter, setFilter] = useState("1 week");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 h-full flex flex-col pt-2 pb-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1 flex items-center gap-2">
            System Analytics Matrix
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-200 font-bold">
              <Sparkles size={10} /> Live Diagnostics
            </span>
          </h2>
          <p className="text-sm text-slate-500 font-medium">Deep-dive into models, simulations, and field actions</p>
        </div>
        
        <div className="glass bg-white p-1 flex items-center shadow-sm rounded-xl border border-slate-200">
          {["Last 3 days", "1 week", "1 month"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${filter === f ? "bg-primary-600 text-white shadow-md shadow-primary-500/20" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[400px]">
           {/* Chart 1: AI Mobile */}
           <div className="glass bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/50 rounded-full blur-[60px] -mr-10 -mt-20 pointer-events-none" />
             <div className="mb-6 z-10">
                 <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shadow border border-primary-200">
                       <TrendingUp size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Machine Vision Efficacy</h3>
                 </div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-11">Yolo vs MobileNet</p>
             </div>
             <div className="flex-1 w-full relative z-10 min-h-[260px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={accuracyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} domain={[60, 100]} dx={-10} />
                   <Tooltip cursor={{ stroke: '#0891b2', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                   <Line type="monotone" dataKey="mobileNet" name="MobileNet Det." stroke="#94a3b8" strokeWidth={3} dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }} />
                   <Line type="monotone" dataKey="yolo" name="YOLOv8 Det." stroke="#0891b2" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 6, fill: '#0891b2', strokeWidth: 0 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Chart 2: Simulation */}
           <div className="glass bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/50 rounded-full blur-[60px] -mr-10 -mt-20 pointer-events-none" />
             <div className="mb-6 z-10">
                 <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shadow border border-rose-200">
                       <Activity size={16} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">ABM Outbreak Simulation</h3>
                 </div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-11">Unmitigated Spread Timeline</p>
             </div>
             <div className="flex-1 w-full relative z-10 min-h-[260px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={simulationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                   <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                   <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={10} />
                   <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                   <Area yAxisId="left" type="monotone" dataKey="riskLevel" name="Risk %" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
                   <Area yAxisId="right" type="monotone" dataKey="mosquitoPop" name="Pop. Density" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPop)" strokeWidth={3} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>

         {/* Chart 3: Barangay Actions */}
         <div className="glass bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden h-[380px]">
             <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100/30 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
             <div className="mb-6 z-10 flex items-center justify-between">
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                       <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shadow border border-emerald-200">
                          <Users size={16} strokeWidth={2.5} />
                       </div>
                       <h3 className="text-lg font-black text-slate-900">Barangay Operational Status</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-11">Cleared vs Pending Dispatches</p>
                 </div>
                 <button className="bg-white border border-slate-200 shadow-sm px-4 py-2 font-bold text-xs text-slate-600 rounded-lg hover:bg-slate-50">
                    Export Data
                 </button>
             </div>
             <div className="flex-1 w-full relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barangayActions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                    <Bar dataKey="cleared" name="Verified & Cleared" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="pending" name="Actions Pending" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
         </div>
      </div>
    </div>
  );
}
