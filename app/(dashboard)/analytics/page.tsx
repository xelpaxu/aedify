'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar } from 'recharts'
import { TrendingUp, Activity, Users, Download } from 'lucide-react'
import { mockAssignments } from '../../../src/lib/mockData'
import { useLanguage } from '../../../src/lib/translations'

const accuracyData = [
  { day: "Mon", smart: 85, basic: 78 },
  { day: "Tue", smart: 88, basic: 80 },
  { day: "Wed", smart: 91, basic: 79 },
  { day: "Thu", smart: 89, basic: 81 },
  { day: "Fri", smart: 93, basic: 82 },
  { day: "Sat", smart: 94, basic: 84 },
  { day: "Sun", smart: 95, basic: 83 },
]

const barangayActions = Object.values(
  mockAssignments.reduce((acc, curr) => {
    const key = curr.assignee?.team ?? "Unassigned"
    if (!acc[key]) {
      acc[key] = { name: key, cleared: 0, pending: 0 }
    }
    if (curr.status === "Completed") {
      acc[key].cleared += 1
    } else {
      acc[key].pending += 1
    }
    return acc
  }, {} as Record<string, { name: string; cleared: number; pending: number }>)
)

const simulationData = [
  { time: "Day 1", riskLevel: 20, mosquitoPop: 300 },
  { time: "Day 3", riskLevel: 35, mosquitoPop: 450 },
  { time: "Day 5", riskLevel: 50, mosquitoPop: 800 },
  { time: "Day 7", riskLevel: 80, mosquitoPop: 1500 },
  { time: "Day 10", riskLevel: 95, mosquitoPop: 2400 },
]

export default function AnalyticsPage() {
  const [filter, setFilter] = useState("1 week")
  const { t } = useLanguage()

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col pb-6 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('systemAnalytics')}</h1>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200/60 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('liveDiagnostics')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{t('deepDive')}</p>
        </div>
        
        <div className="bg-white p-1 flex items-center shadow-sm rounded-xl border border-slate-200/60">
          {[t('last3days'), t('oneWeek'), t('oneMonth')].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === f ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-h-[380px] stagger-children">
           {/* Detection Accuracy */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col h-full">
              <div className="mb-5">
                  <div className="flex items-center gap-2.5 mb-1">
                     <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <TrendingUp size={16} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-slate-900">{t('detectionAccuracy')}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{t('smartVsBasic')}</p>
                     </div>
                  </div>
              </div>
              <div className="flex-1 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} domain={[60, 100]} dx={-10} />
                    <Tooltip cursor={{ stroke: '#0891b2', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                    <Line type="monotone" dataKey="basic" name="Basic Detection" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3, strokeWidth: 1.5, fill: '#fff' }} />
                    <Line type="monotone" dataKey="smart" name="Smart Detection" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 6, fill: '#0891b2', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Outbreak Simulation */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col h-full">
              <div className="mb-5">
                  <div className="flex items-center gap-2.5 mb-1">
                     <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <Activity size={16} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-slate-900">{t('outbreakSimulation')}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{t('spreadTimeline')}</p>
                     </div>
                  </div>
              </div>
              <div className="flex-1 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={10} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                    <Area yAxisId="left" type="monotone" dataKey="riskLevel" name="Risk %" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="mosquitoPop" name="Pop. Density" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPop)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
         </div>

         {/* Barangay Progress */}
         <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col h-[360px]">
              <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                     <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <Users size={16} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 className="text-sm font-bold text-slate-900">{t('barangayProgress')}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{t('clearedVsPending')}</p>
                     </div>
                  </div>
                  <button className="flex items-center gap-1.5 bg-white border border-slate-200/60 px-3 py-1.5 font-semibold text-xs text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                     <Download size={12} />
                     {t('exportData')}
                  </button>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={barangayActions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={36}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                     <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '12px' }} />
                     <Legend iconType="square" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 600 }} />
                     <Bar dataKey="cleared" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                     <Bar dataKey="pending" name="Pending" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
              </div>
         </div>
      </div>
    </div>
  )
}
