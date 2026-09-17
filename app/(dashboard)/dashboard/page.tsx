'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  AlertTriangle,
  Users,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Sparkles,
  ListFilter,
  CheckCircle2,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Activity,
  Navigation,
  X,
  User,
  Building,
  Loader2
} from 'lucide-react'
import { mockReports, mockAssignments } from '../../../src/lib/mockData'
import { useAuth } from '../../../src/lib/auth'
import { useLanguage } from '../../../src/lib/translations'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  groupReportsByLocation,
  LocationCluster,
  getLocationHierarchy,
  extractConfidenceScore
} from '../../../src/lib/geoUtils'
import { normalizeReportImage } from '@/src/lib/reportImages'
import L from 'leaflet'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

const dashboardPinCache = new Map<string, L.DivIcon>()

function getDashboardClusterPin(risk?: string, count: number = 1): L.DivIcon {
  const r = risk || 'Low'
  const key = `${r}_${count}`
  if (dashboardPinCache.has(key)) return dashboardPinCache.get(key)!

  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (r === 'High' || r === 'CRITICAL' || r === 'critical') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (r === 'Medium' || r === 'Moderate' || r === 'MODERATE' || r === 'moderate' || r === 'pending' || r === 'PENDING') {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = 38
  const badgeHtml = count > 1 ? `
    <div class="absolute -top-1.5 -right-1.5 z-20 flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-slate-950 text-white text-[10px] font-black rounded-full border-2 border-white shadow-lg">
      ${count}
    </div>
  ` : ''

  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      <img src="${iconUrl}" alt="Pin" class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom group-hover:scale-125 select-none pointer-events-none" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));" />
      ${badgeHtml}
    </div>`

  const icon = L.divIcon({ html, className: 'custom-map-pin', iconSize: [size, size], iconAnchor: [size / 2, size - 2], popupAnchor: [0, -size] })
  dashboardPinCache.set(key, icon)
  return icon
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (map && center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

function getRelativeTime(timestamp: number | Date | string | undefined): string {
  if (!timestamp) return 'Just now'
  const timeMs = typeof timestamp === 'number'
    ? timestamp
    : timestamp instanceof Date
      ? timestamp.getTime()
      : new Date(timestamp).getTime()
  if (isNaN(timeMs)) return 'Recently'

  const diffSeconds = Math.floor((Date.now() - timeMs) / 1000)
  if (diffSeconds < 30) return 'Just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timeMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface LiveActivityItem {
  id: string
  type: 'report' | 'assignment'
  title: string
  subtitle: string
  location: string
  severity: 'Critical' | 'Moderate' | 'Low' | 'Verified' | 'Resolved' | 'Assigned'
  timestamp: number
  thumbnail: string
  actor: string
  link: string
  badgeColor: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLanguage()

  // Real-time Convex Queries & Mutations
  const convexReports = useQuery(api.reports.getAllReports)
  const convexAssignments = useQuery(api.assignments.getActiveAssignments)
  const convexTeams = useQuery(api.assignments.getAllTeams)
  const resolveReportMutation = useMutation(api.reports.resolveReport)

  const [activityFilter, setActivityFilter] = useState<'all' | 'critical' | 'reports' | 'dispatches'>('all')
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [isResolvingArea, setIsResolvingArea] = useState(false)
  const [areaResolveSuccess, setAreaResolveSuccess] = useState(false)

  // Center Coordinates based on user role
  let center: [number, number] = [10.6953, 122.5447]
  let zoomLevel = 13
  if (user?.role === 'brgy-calumpang') { center = [10.6975, 122.5367]; zoomLevel = 15 }
  if (user?.role === 'brgy-sanjuan') { center = [10.6860, 122.5404]; zoomLevel = 15 }
  if (user?.role === 'brgy-southfundidor') { center = [10.6883, 122.5312]; zoomLevel = 15 }

  // Unified Real & Fallback Reports
  const reportsData = useMemo(() => {
    if (convexReports && convexReports.length > 0) {
      return convexReports
    }
    return mockReports.map(m => ({
      _id: m.id as any,
      _creationTime: m.timestamp.getTime(),
      locationName: m.location,
      userName: 'Tanod Patrol',
      description: `${m.title} - ${m.classification}`,
      status: m.risk === 'High' ? 'critical' : m.risk === 'Medium' ? 'pending' : 'verified',
      accuracy: typeof m.confidence === 'number' ? m.confidence : 85,
      detections: [m.classification],
      reasoning: 'AI vector classification identified breeding hazards within local perimeter.',
      lat: m.coordinates[0],
      lng: m.coordinates[1],
      verified: m.risk !== 'High',
      imageUri: m.rawPhoto,
      processedImage: m.rawPhoto,
    }))
  }, [convexReports])

  // Unified Assignments Data
  const assignmentsData = useMemo(() => {
    if (convexAssignments && convexAssignments.length > 0) {
      return convexAssignments
    }
    return mockAssignments.map(a => ({
      _id: a.id as any,
      teamName: a.assignee?.team || 'Tanod Response Team',
      teamAvatar: a.assignee?.avatar || '',
      region: 'Molo District',
      location: a.assignee ? `Assigned to ${a.assignee.name}` : 'Unassigned Sector',
      reportStatus: a.status === 'Completed' ? 'Resolved' : 'PENDING',
      reportDescription: `Dispatch task for ${a.reportId}`,
      assignedAt: Date.now() - 1000 * 60 * 60 * 2,
    }))
  }, [convexAssignments])

  // Active Unresolved Reports for Map
  const activeReportsForMap = useMemo(() => {
    return reportsData.filter((r: any) =>
      r.status !== 'dismissed' &&
      r.status !== 'Completed' &&
      r.status?.toLowerCase() !== 'resolved'
    )
  }, [reportsData])

  // Group Reports by Exact Location (NO OFFSETS)
  const locationClusters: LocationCluster[] = useMemo(() => {
    return groupReportsByLocation(activeReportsForMap)
  }, [activeReportsForMap])

  const selectedCluster = useMemo(() => {
    return locationClusters.find(c => c.id === selectedClusterId) || null
  }, [locationClusters, selectedClusterId])

  // Key Metric Calculations
  const stats = useMemo(() => {
    let critical = 0
    let pending = 0
    let verified = 0
    let resolved = 0

    reportsData.forEach((r: any) => {
      const s = r.status?.toLowerCase() || ''
      if (s === 'resolved' || s === 'completed') {
        resolved++
      } else if (s === 'critical' || (r as any).risk === 'High') {
        critical++
      } else if (r.verified || s === 'verified') {
        verified++
      } else {
        pending++
      }
    })

    const activeHotspots = critical + pending + verified

    let personnelCount = 0
    if (convexTeams && convexTeams.length > 0) {
      personnelCount = convexTeams.length
    } else {
      const uniqueAssignees = new Set(mockAssignments.filter(a => a.assignee).map(a => a.assignee!.name))
      personnelCount = Math.max(uniqueAssignees.size, 4)
    }

    const topRisk = reportsData.find((r: any) => r.status?.toLowerCase() === 'critical' || (r as any).risk === 'High') || reportsData[0]

    return {
      activeHotspots,
      critical,
      pending,
      verified,
      resolved,
      personnelCount,
      topRisk
    }
  }, [reportsData, convexTeams])

  // Real Live Activity Stream with Annotated Images Prioritized
  const liveActivities: LiveActivityItem[] = useMemo(() => {
    const list: LiveActivityItem[] = []

    reportsData.forEach((r: any) => {
      const isCritical = r.status?.toLowerCase() === 'critical' || (r as any).risk === 'High'
      const isVerified = r.verified === true || r.status?.toLowerCase() === 'verified'
      const isResolved = r.status?.toLowerCase() === 'resolved' || r.status?.toLowerCase() === 'completed'
      const loc = getLocationHierarchy(r)
      
      // ✅ Prioritize REAL annotated image (processedImage)
      const annotatedImg = normalizeReportImage(r.processedImage) || normalizeReportImage(r.imageUri) || '/assets/images/breeding-site.jpeg'

      let severity: LiveActivityItem['severity'] = 'Moderate'
      let badgeColor = 'bg-amber-100 text-amber-800 border-amber-200'

      if (isResolved) {
        severity = 'Resolved'
        badgeColor = 'bg-slate-100 text-slate-700 border-slate-200'
      } else if (isCritical) {
        severity = 'Critical'
        badgeColor = 'bg-rose-100 text-rose-700 border-rose-200'
      } else if (isVerified) {
        severity = 'Verified'
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
      }

      list.push({
        id: `report-${r._id}`,
        type: 'report',
        title: isCritical
          ? 'Critical Risk Vector Site'
          : isVerified
            ? 'Verified Vector Site'
            : 'Hazard Report Submitted',
        subtitle: r.detections?.[0] || r.description || 'Stagnant water breeding habitat',
        location: loc.formatted,
        severity,
        timestamp: r._creationTime || (r.timestamp ? new Date(r.timestamp).getTime() : Date.now()),
        thumbnail: annotatedImg,
        actor: r.userName || 'Tanod Patrol',
        link: `/reports/${r._id}`,
        badgeColor
      })
    })

    assignmentsData.forEach((a: any) => {
      const isCompleted = a.reportStatus?.toLowerCase() === 'resolved' || a.status?.toLowerCase() === 'completed'
      const annotImg = normalizeReportImage(a.reportProcessedImage) || normalizeReportImage(a.reportImage) || '/assets/images/breeding-site.jpeg'

      list.push({
        id: `assignment-${a._id}`,
        type: 'assignment',
        title: isCompleted ? 'Vector Site Abated & Cleared' : 'Tanod Team Dispatched',
        subtitle: a.reportDescription || 'Field response action in progress',
        location: a.location || 'Molo Health Zone',
        severity: isCompleted ? 'Resolved' : 'Assigned',
        timestamp: a.assignedAt || (a.assignedDate ? new Date(a.assignedDate).getTime() : Date.now()),
        thumbnail: annotImg,
        actor: a.teamName || 'Patrol Unit',
        link: `/assignments/${a._id}`,
        badgeColor: isCompleted
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : 'bg-indigo-100 text-indigo-700 border-indigo-200'
      })
    })

    list.sort((a, b) => b.timestamp - a.timestamp)
    return list
  }, [reportsData, assignmentsData])

  const filteredActivities = useMemo(() => {
    return liveActivities.filter(act => {
      if (activityFilter === 'critical') return act.severity === 'Critical'
      if (activityFilter === 'reports') return act.type === 'report'
      if (activityFilter === 'dispatches') return act.type === 'assignment'
      return true
    })
  }, [liveActivities, activityFilter])

  const topRiskReport = stats.topRisk
  const topRiskLoc = topRiskReport ? getLocationHierarchy(topRiskReport).formatted : 'Molo District'
  const topRiskClassification = topRiskReport?.detections?.[0] || 'Mosquito Breeding Grounds'
  const isTopRiskCritical = topRiskReport && (topRiskReport.status?.toLowerCase() === 'critical' || (topRiskReport as any).risk === 'High')

  // Handle Linked Area Resolution directly from the dashboard
  const handleResolveArea = async (cluster: LocationCluster) => {
    const top = cluster.topReport
    if (!top || !top._id) return

    setIsResolvingArea(true)
    try {
      const idStr = String(top._id)
      if (!idStr.startsWith('#') && !idStr.startsWith('mock')) {
        await resolveReportMutation({
          reportId: top._id,
          resolutionNotes: `Area resolved at ${cluster.locationName}`
        })
      }
      setAreaResolveSuccess(true)
      setTimeout(() => setAreaResolveSuccess(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setIsResolvingArea(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1600px] w-full mx-auto pb-10">
      {/* ----- HEADER ----- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {t('surveillanceOverview')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time vector monitoring, AI hotspot classification, and tanod dispatch readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              {t('liveSec')}: <span className="text-primary-700">{user?.role?.startsWith('brgy') ? t('barangayLocal') : t('molosector')}</span>
            </span>
          </div>
          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            View Reports
          </button>
        </div>
      </div>

      {/* ----- HIERARCHICAL STAT CARDS GRID ----- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* HERO / TIER 1 METRIC: Clean Header without Directive/Live Sync tags */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white p-6 shadow-xl border border-slate-800 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary-500/15 transition-all duration-500" />
          
          <div>
            <div className="relative z-10 space-y-1.5">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                {isTopRiskCritical ? `Elevated Risk: ${topRiskLoc}` : `Stable Perimeter: ${topRiskLoc}`}
              </h2>
              <p className="text-xs text-slate-300 line-clamp-2 max-w-xl">
                {isTopRiskCritical
                  ? `AI vector telemetry identified ${topRiskClassification.toLowerCase()} with urgent stagnant water index.`
                  : 'All monitored sectors operating within standard baseline threshold.'}
              </p>
            </div>
          </div>

          {/* Action Row & Micro-Metrics Strip */}
          <div className="mt-5 pt-4 border-t border-white/10 relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                {stats.critical} Critical Urgency
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-semibold">
                {stats.pending} Pending Review
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">
                {stats.verified} Verified
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={topRiskReport ? `/reports/${topRiskReport._id}` : '/reports'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all"
              >
                Review Hazard
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={topRiskReport ? `/assignments?reportId=${topRiskReport._id}` : '/assignments'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-lg shadow-primary-900/40 transition-all active:scale-95"
              >
                <Zap className="h-3.5 w-3.5" />
                Dispatch Tanods
              </Link>
            </div>
          </div>
        </div>

        {/* TIER 2: Active Hotspots & Hazards Card */}
        <Link
          href="/reports?status=critical"
          className="group relative bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Hotspots
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {stats.activeHotspots}
                  </h3>
                  {stats.critical > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      {stats.critical} Critical
                    </span>
                  )}
                </div>
              </div>

              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Vector habitats requiring active field intervention.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-primary-700">
            <span>Filter Critical Sites</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* TIER 2: Field Personnel & Patrol Deployment Card */}
        <Link
          href="/assignments"
          className="group relative bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tanod Units
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {stats.personnelCount}
                  </h3>
                  <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    On Duty
                  </span>
                </div>
              </div>

              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Active tanod response teams assigned to containment.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>View Deployments</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* ----- LOWER SECTION: EXACT MAP (NO OFFSETS) & REAL LIVE ACTIVITY FEED ----- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[560px]">
        
        {/* Interactive Map Section (2 Cols on xl) */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col relative">
          {/* Top Floating Map Badge */}
          <div className="absolute top-4 left-4 z-[400] bg-slate-950/85 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10 shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-black text-white">{t('globalScan')}</h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                {activeReportsForMap.length} active vector incidents across {locationClusters.length} location areas
              </p>
            </div>
          </div>

          <MapContainer
            center={center}
            zoom={zoomLevel}
            className="w-full h-full z-0"
            zoomControl={false}
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia</a>'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              keepBuffer={8}
            />
            <MapUpdater center={center} zoom={zoomLevel} />
            {locationClusters.map(cluster => (
              <Marker
                key={cluster.id}
                position={[cluster.lat, cluster.lng] as [number, number]}
                icon={getDashboardClusterPin(cluster.highestRisk, cluster.totalReports)}
                eventHandlers={{
                  click: () => setSelectedClusterId(cluster.id)
                }}
              />
            ))}
          </MapContainer>

          {/* Area Sidepanel on Dashboard Map */}
          {selectedCluster && (
            <div className="absolute top-0 right-0 bottom-0 w-[380px] max-w-full bg-white z-[500] shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
              {/* Header */}
              <div className="relative h-36 bg-slate-950 shrink-0 overflow-hidden">
                <img
                  src={normalizeReportImage(selectedCluster.topReport?.processedImage || selectedCluster.topReport?.imageUri) || '/assets/images/breeding-site.jpeg'}
                  alt={selectedCluster.locationName}
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                <button
                  onClick={() => setSelectedClusterId(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
                >
                  <X size={16} />
                </button>

                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white shadow-sm">
                    {selectedCluster.highestRisk}
                  </span>
                  {selectedCluster.totalReports > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 text-white border border-white/20">
                      {selectedCluster.totalReports} Co-located Reports
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
                  <h3 className="text-white font-bold text-sm leading-tight">{selectedCluster.locationHierarchy.formatted}</h3>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
                {areaResolveSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    All {selectedCluster.totalReports} incidents in this area resolved!
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>GPS: {selectedCluster.lat.toFixed(5)}, {selectedCluster.lng.toFixed(5)}</span>
                  <span className="font-bold text-slate-700">{selectedCluster.totalReports} Incidents</span>
                </div>

                {/* Individual Reports List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Area Incidents</p>
                  {selectedCluster.reports.map((rep: any, idx: number) => {
                    const repImg = normalizeReportImage(rep.processedImage || rep.imageUri) || '/assets/images/breeding-site.jpeg'
                    const conf = extractConfidenceScore(rep)
                    return (
                      <div key={rep._id || idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                        <div className="flex gap-2.5">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-200">
                            <img src={repImg} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {rep.description || rep.title || 'Breeding vector site'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {rep.userName || 'Tanod'} • {conf}% AI confidence
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {rep._creationTime ? new Date(rep._creationTime).toLocaleDateString() : 'Active'}
                          </span>
                          <Link
                            href={`/reports/${rep._id}`}
                            className="text-[10px] font-bold text-primary-700 hover:text-primary-900 flex items-center gap-0.5"
                          >
                            View Dossier <ChevronRight size={10} />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-1.5">
                <button
                  onClick={() => handleResolveArea(selectedCluster)}
                  disabled={isResolvingArea}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-75"
                >
                  {isResolvingArea ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Resolving Area...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      Resolve Area ({selectedCluster.totalReports} Report{selectedCluster.totalReports > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real Live Activity Feed (1 Col on xl) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col min-h-0">
          
          {/* Activity Feed Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {t('activeStream')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Real-time incident dispatches & detections
              </p>
            </div>

            <Link
              href="/reports"
              className="text-[11px] font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              All
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 py-2.5 shrink-0 overflow-x-auto">
            {(['all', 'critical', 'reports', 'dispatches'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivityFilter(tab)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold capitalize transition-all shrink-0 ${
                  activityFilter === tab
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {tab === 'all' ? 'All Live' : tab}
              </button>
            ))}
          </div>

          {/* Live Scrollable List with Real Annotated Images */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No recent activity matching filter</p>
              </div>
            ) : (
              filteredActivities.map(activity => (
                <Link
                  key={activity.id}
                  href={activity.link}
                  className="group flex gap-3 p-3 bg-slate-50/80 hover:bg-white rounded-2xl transition-all duration-200 border border-slate-100 hover:border-primary-200 hover:shadow-md cursor-pointer block"
                >
                  {/* Real Annotated Image Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative bg-slate-900 border border-slate-200">
                    <img
                      src={activity.thumbnail}
                      alt={activity.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
                      }}
                    />
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-primary-700 transition-colors">
                        {activity.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {activity.subtitle}
                    </p>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="truncate">{activity.location}</span>
                      </span>

                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md border ${activity.badgeColor}`}>
                        {activity.severity}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
