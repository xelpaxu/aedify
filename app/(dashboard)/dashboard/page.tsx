'use client'

import dynamic from 'next/dynamic'
import { MetricCard } from '../../../src/components/dashboard/MetricCard'
import { MapPin, AlertTriangle, ListFilter, Navigation, Users } from 'lucide-react'
import { mockDashboardActivities, mockReports, mockAssignments } from '../../../src/lib/mockData'
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false })

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  map.setView(center, zoom)
  return null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  let center: [number, number] = [10.6953, 122.5447]
  let zoomLevel = 13

  if (user?.role === 'brgy-calumpang') { center = [10.6975, 122.5367]; zoomLevel = 15 }
  if (user?.role === 'brgy-sanjuan') { center = [10.6860, 122.5404]; zoomLevel = 15 }
  if (user?.role === 'brgy-southfundidor') { center = [10.6883, 122.5312]; zoomLevel = 15 }

  const openReports = mockReports.filter((r) => r.status === "OPEN")
  const activeHotspots = openReports.length
  const personnelAssigned = new Set(
    mockAssignments
      .filter((a) => a.assignee)
      .map((a) => a.assignee!.name)
  ).size

  const topRiskReport = openReports.find((r) => r.risk === "High") ?? openReports[0]
  const riskUpdateTitle = topRiskReport
    ? `${t('elevatedRisk')} ${topRiskReport.location}`
    : t('allSectorsStable')
  const riskUpdateSubtitle = topRiskReport
    ? `${t('detected')} ${topRiskReport.classification.toLowerCase()} ${topRiskReport.timeAgo}.`
    : t('noOpenIncidents')

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1600px] w-full mx-auto pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('surveillanceOverview')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time monitoring and risk assessment</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600">{t('liveSec')}: {user?.role?.startsWith('brgy') ? t('barangayLocal') : t('molosector')}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          title={t('activeHotspots')}
          value={String(activeHotspots)}
          subtitle={t('requiringAction')}
          icon={<AlertTriangle size={20} strokeWidth={2} />}
          trend={activeHotspots > 0 ? `+${activeHotspots}%` : "0%"}
          trendUp={activeHotspots > 0}
        />
        <MetricCard
          title={t('fieldPersonnel')}
          value={String(personnelAssigned)}
          subtitle={t('activeDeployed')}
          icon={<Users size={20} strokeWidth={2} />}
        />
        <div className="col-span-1 md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10 mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{t('riskUpdate')}</span>
          </div>
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <p className="text-xl font-bold text-slate-900 leading-snug">{riskUpdateTitle}</p>
              <p className="text-sm text-slate-500 mt-1.5">{riskUpdateSubtitle}</p>
            </div>
            <button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0">
              {t('executeProtocols')}
            </button>
          </div>
        </div>
      </div>

      {/* Map + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 h-[480px]">
        {/* Map */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/60 overflow-hidden flex flex-col relative">
          <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 border border-slate-200/60">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">{t('globalScan')}</h3>
              <p className="text-[10px] text-slate-500">{t('realtimeMap')}</p>
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

          <div className="absolute bottom-4 right-4 z-[400] bg-white p-1 flex flex-col gap-1 shadow-md border border-slate-200/60 rounded-xl">
            <button className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm leading-none transition-colors">+</button>
            <button className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-sm leading-none transition-colors">-</button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('activeStream')}</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{t('liveUpdates')}</p>
            </div>
            <button className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
              <ListFilter size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
            {mockDashboardActivities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex gap-3 p-3 bg-slate-50 hover:bg-white rounded-xl transition-all duration-200 border border-slate-100 hover:border-slate-200/60 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative border border-slate-200/60">
                  <img src={activity.thumbnail} alt={activity.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-semibold text-slate-800 truncate">{activity.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {activity.location}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md
                         ${activity.severity === 'High' ? 'bg-rose-100 text-rose-700' : activity.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {activity.severity}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
