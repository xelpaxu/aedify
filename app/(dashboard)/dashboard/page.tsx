'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MetricCard } from '../../../src/components/dashboard/MetricCard'
import { MapPin, AlertTriangle, ListFilter, Navigation, Users, ShieldCheck, Clock } from 'lucide-react'
import { mockDashboardActivities, mockReports, mockAssignments } from '../../../src/lib/mockData'
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { applyCoordinateOffsets, formatReportLocation } from '../../../src/lib/geoUtils'

import L from 'leaflet'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

// Icon cache to avoid recreating DOM on render cycles
const dashboardPinCache = new Map<string, L.DivIcon>()

function getDashboardPin(risk?: string): L.DivIcon {
  const r = risk || 'Low'
  if (dashboardPinCache.has(r)) {
    return dashboardPinCache.get(r)!
  }

  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (r === 'High' || r === 'CRITICAL' || r === 'critical') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (r === 'Medium' || r === 'Moderate' || r === 'MODERATE' || r === 'moderate' || r === 'pending') {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = 34
  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      <img
        src="${iconUrl}"
        alt="Pin"
        class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom group-hover:scale-125 select-none pointer-events-none"
        style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));"
      />
    </div>
  `

  const icon = L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size],
  })

  dashboardPinCache.set(r, icon)
  return icon
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  map.setView(center, zoom)
  return null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const convexReports = useQuery(api.reports.getAllReports)

  let center: [number, number] = [10.6953, 122.5447]
  let zoomLevel = 13

  if (user?.role === 'brgy-calumpang') { center = [10.6975, 122.5367]; zoomLevel = 15 }
  if (user?.role === 'brgy-sanjuan') { center = [10.6860, 122.5404]; zoomLevel = 15 }
  if (user?.role === 'brgy-southfundidor') { center = [10.6883, 122.5312]; zoomLevel = 15 }

  // 1. Only show verified reports in the map
  const verifiedRaw = useMemo(() => {
    if (convexReports && convexReports.length > 0) {
      return convexReports
        .filter(r => r.verified === true && r.status !== 'dismissed' && r.status !== 'Completed')
        .map(r => ({
          id: r._id as any, // Cast to any to fix TypeScript error
          lat: r.lat ?? 10.6953,
          lng: r.lng ?? 122.5447,
          location: formatReportLocation(r),
          risk: r.status === 'critical' ? 'High' : r.status === 'verified' ? 'Low' : 'Medium',
          classification: r.detections?.[0] || 'Breeding site',
          title: r.locationName || 'Vector Hotspot',
          rawPhoto: r.processedImage || r.imageUri || '/assets/images/breeding-site.jpeg',
          timeAgo: 'Live',
        }))
    }
    return mockReports.filter(m => m.status === 'OPEN').map(m => ({
      id: m.id as any, // Cast to any to fix TypeScript error
      lat: m.coordinates[0],
      lng: m.coordinates[1],
      location: formatReportLocation({ locationName: m.location, lat: m.coordinates[0], lng: m.coordinates[1] }),
      risk: m.risk,
      classification: m.classification,
      title: m.title,
      rawPhoto: m.rawPhoto,
      timeAgo: m.timeAgo,
    }))
  }, [convexReports])

  // 2. Coordinate offset algorithm so duplicate coordinates fan out and don't pile up
  const verifiedOffsetReports = useMemo(() => {
    return applyCoordinateOffsets(verifiedRaw, 0.00030)
  }, [verifiedRaw])

  const activeHotspots = verifiedOffsetReports.length
  const personnelAssigned = new Set(
    mockAssignments
      .filter((a) => a.assignee)
      .map((a) => a.assignee!.name)
  ).size

  const topRiskReport = verifiedOffsetReports.find((r) => r.risk === "High") ?? verifiedOffsetReports[0]
  const riskUpdateTitle = topRiskReport
    ? `${t('elevatedRisk')} ${topRiskReport.location}`
    : t('allSectorsStable')
  const riskUpdateSubtitle = topRiskReport
    ? `${t('detected')} ${topRiskReport.classification.toLowerCase()}.`
    : t('noOpenIncidents')

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1600px] w-full mx-auto pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('surveillanceOverview')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time vector monitoring and verified risk assessment</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">{t('liveSec')}: {user?.role?.startsWith('brgy') ? t('barangayLocal') : t('molosector')}</span>
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
        <div className="col-span-1 md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('riskUpdate')}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck size={12} /> Verified Data
            </span>
          </div>
          <div className="relative z-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-lg md:text-xl font-black text-slate-900 leading-snug">{riskUpdateTitle}</p>
              <p className="text-xs text-slate-500 mt-1">{riskUpdateSubtitle}</p>
            </div>
            <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/20 shrink-0 active:scale-95">
              {t('executeProtocols')}
            </button>
          </div>
        </div>
      </div>

      {/* Map + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 h-[480px]">
        {/* Map */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col relative">
          <div className="absolute top-4 left-4 z-[400] bg-slate-950/85 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-white/10 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-black text-white">{t('globalScan')}</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{verifiedOffsetReports.length} verified hotspots mapped</p>
            </div>
          </div>

          <MapContainer
            center={center}
            zoom={zoomLevel}
            className="w-full h-full z-0"
            zoomControl={false}
            preferCanvas={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia</a>'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              keepBuffer={8}
            />
            <MapUpdater center={center} zoom={zoomLevel} />
            {verifiedOffsetReports.map(m => (
              <Marker
                key={m.id}
                position={[m.displayLat, m.displayLng] as [number, number]}
                icon={getDashboardPin(m.risk)}
              />
            ))}
          </MapContainer>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="text-base font-black text-slate-900">{t('activeStream')}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('liveUpdates')}</p>
            </div>
            <button className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl transition-colors">
              <ListFilter size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
            {mockDashboardActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 p-3 bg-slate-50 hover:bg-white rounded-2xl transition-all duration-200 border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative border border-slate-200">
                  <img src={activity.thumbnail} alt={activity.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{activity.title}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10} className="text-rose-500" /> {activity.location}</p>
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
