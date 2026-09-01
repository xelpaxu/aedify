'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  Users,
  Shield,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  X,
  Bot,
  Zap,
  Crosshair,
  Building,
  Navigation,
  ExternalLink,
  UserPlus,
  Image as ImageIcon,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Route,
  Compass,
  Footprints,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useLanguage } from '../../../../src/lib/translations'
import { useReverseGeocode, extractConfidenceScore, formatReportLocation } from '../../../../src/lib/geoUtils'
import { mockAssignments, mockReports } from '../../../../src/lib/mockData'
import L from 'leaflet'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })

// Helper to validate and create image URL from base64 or path (matching reports/page.tsx)
function getValidImageUrl(img: any): string | null {
  if (!img || typeof img !== 'string') return null
  const cleanImg = img.trim()
  if (cleanImg.length === 0) return null

  if (
    cleanImg.startsWith('http://') ||
    cleanImg.startsWith('https://') ||
    cleanImg.startsWith('data:')
  ) {
    return cleanImg
  }

  if (cleanImg.startsWith('/assets/') || cleanImg.startsWith('/images/')) {
    return cleanImg
  }

  if (cleanImg.startsWith('assets/') || cleanImg.startsWith('images/')) {
    return `/${cleanImg}`
  }

  return `data:image/jpeg;base64,${cleanImg}`
}

function getCustomPin(status?: string) {
  const s = status?.toUpperCase() || ''
  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (s === 'CRITICAL' || s === 'HIGH') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (s === 'MODERATE' || s === 'MEDIUM' || s === 'PENDING' || s === 'IN PROGRESS' || s === 'ASSIGNED') {
    iconUrl = '/assets/images/pin_moderate.png'
    glowColor = 'rgba(245, 158, 11, 0.55)'
  }

  const size = 38
  const html = `
    <div class="group relative flex items-center justify-center cursor-pointer" style="width:${size}px; height:${size}px;">
      <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style="background: radial-gradient(circle, ${glowColor} 0%, transparent 70%); transform: scale(1.4);"></div>
      <img
        src="${iconUrl}"
        alt="Hotspot Pin"
        class="w-full h-full object-contain transition-transform duration-200 ease-out origin-bottom group-hover:scale-125 select-none pointer-events-none"
        style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));"
      />
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size],
  })
}

function getTanodPin(teamLabel?: string) {
  const name = teamLabel ? teamLabel.replace('Tanod Team ', '') : 'Tanod Unit'
  const html = `
    <div class="group relative flex flex-col items-center cursor-pointer select-none" style="width: 130px; margin-left: -65px; margin-top: -46px;">
      <div class="relative flex items-center justify-center" style="width: 44px; height: 44px;">
        <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></div>
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-black">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
        </div>
      </div>
      <div class="mt-1 px-2.5 py-0.5 rounded-md bg-slate-950/95 text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-md border border-white/20 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>${name}</span>
      </div>
    </div>
  `
  return L.divIcon({
    html,
    className: 'tanod-team-pin',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -46],
  })
}

// Function to resolve Tanod base / outpost location
function getTanodPostInfo(teamOrAssignment: any) {
  if (!teamOrAssignment) return null

  const text = `${teamOrAssignment?.barangay || ''} ${teamOrAssignment?.region || ''} ${teamOrAssignment?.teamName || ''} ${teamOrAssignment?.name || ''}`.toLowerCase()
  const leader = teamOrAssignment?.memberNames?.[0] || teamOrAssignment?.leaderName || 'Patrol Officer'
  const teamName = teamOrAssignment?.teamName || teamOrAssignment?.name || 'Tanod Team'

  if (text.includes('south')) {
    return {
      coords: [10.6883, 122.5312] as [number, number],
      postName: 'Brgy. South Fundidor Tanod Station',
      barangay: 'South Fundidor',
      teamName,
      leader,
    }
  }
  if (text.includes('san juan') || text.includes('juan')) {
    return {
      coords: [10.6860, 122.5404] as [number, number],
      postName: 'Brgy. San Juan Tanod Patrol Post',
      barangay: 'San Juan',
      teamName,
      leader,
    }
  }
  if (text.includes('calumpang')) {
    return {
      coords: [10.6975, 122.5367] as [number, number],
      postName: 'Brgy. Calumpang Tanod Headquarters',
      barangay: 'Calumpang',
      teamName,
      leader,
    }
  }
  return {
    coords: [10.6953, 122.5447] as [number, number],
    postName: 'Molo Central Tanod Outpost',
    barangay: 'Molo Central',
    teamName,
    leader,
  }
}

function FitMapBounds({ points }: { points: [number, number][] }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (!map || !points || points.length === 0) return
    const valid = points.filter(p => p && !isNaN(p[0]) && !isNaN(p[1]))
    if (valid.length === 1) {
      map.setView(valid[0], 16)
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map(p => L.latLng(p[0], p[1])))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [points, map])
  return null
}

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 animate-pulse">
      <div className="relative overflow-hidden rounded-3xl bg-slate-200 h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-3xl p-6 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="h-4 bg-slate-100 rounded w-full" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-24" />
            <div className="h-44 bg-slate-200 rounded-2xl w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = (params.id as string) || ''
  const { t } = useLanguage()

  // Safe collection queries to support both assignment IDs and report IDs without ArgumentValidationError
  const convexAssignments = useQuery(api.assignments.getActiveAssignments)
  const convexReports = useQuery(api.reports.getAllReports)
  const teams = useQuery(api.assignments.getAllTeams)
  const createAssignment = useMutation(api.assignments.createAssignment)
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus)

  // Local dispatch state
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [showAllSteps, setShowAllSteps] = useState(false)

  // 1. Resolve Assignment (if rawId is an assignment ID or linked to an assignment)
  const convexAssignment = useMemo(() => {
    return convexAssignments?.find(
      (a: any) => a._id === rawId || a.reportId === rawId
    ) || null
  }, [convexAssignments, rawId])

  const mockAssignmentFallback = useMemo(() => {
    return mockAssignments.find(
      (m: any) => m.id === rawId || m.id.replace('#', '') === rawId.replace('#', '') || m.reportId === rawId
    ) || null
  }, [rawId])

  const isAssignment = Boolean(convexAssignment || mockAssignmentFallback)

  const assignment: any = useMemo(() => {
    if (convexAssignment) return convexAssignment
    if (mockAssignmentFallback) {
      return {
        _id: mockAssignmentFallback.id,
        teamName: mockAssignmentFallback.assignee?.team || 'Tanod Team Calumpang',
        barangay: (mockAssignmentFallback.assignee?.team?.includes('South') || mockAssignmentFallback.id === '#AS-2026-003') ? 'South Fundidor' : 'Calumpang',
        region: (mockAssignmentFallback.assignee?.team?.includes('South') || mockAssignmentFallback.id === '#AS-2026-003') ? 'South Fundidor' : 'Calumpang',
        location: 'Zone 3, Brgy. Calumpang',
        status: mockAssignmentFallback.status === 'Pending' ? 'Assigned' : mockAssignmentFallback.status,
        reportStatus: 'CRITICAL',
        assignedAt: Date.now() - 1000 * 60 * 60 * 4,
        locationLat: 10.68498,
        locationLng: 122.53764,
        memberNames: ['Tanod Officer R. Santos', 'Tanod Officer J. Dela Cruz'],
        memberIds: ['mem-1', 'mem-2'],
        leaderId: 'mem-1',
        reportDescription: 'Stagnant water ponding with dense discarded tires creating high vector proliferation hazard.',
        reportReasoning: 'AI model flagged rapid larval development risks due to high moisture index and surface heat.',
        reportAccuracy: 92,
        rawPhoto: '/assets/images/breeding-site.jpeg',
      }
    }
    return null
  }, [convexAssignment, mockAssignmentFallback])

  // 2. Resolve Report (from Convex reports or mock reports)
  const targetReportId = convexAssignment?.reportId || mockAssignmentFallback?.reportId || rawId

  const convexReport = useMemo(() => {
    return convexReports?.find(
      (r: any) => r._id === targetReportId || r._id === rawId
    ) || null
  }, [convexReports, targetReportId, rawId])

  const mockReportFallback = useMemo(() => {
    return mockReports.find(
      (m: any) => m.id === targetReportId || m.id.replace('#', '') === targetReportId.replace('#', '') || m.id === rawId || m.id.replace('#', '') === rawId.replace('#', '')
    ) || null
  }, [targetReportId, rawId])

  const isPendingReport = !isAssignment && Boolean(convexReport || mockReportFallback)

  const reportObj: any = useMemo(() => {
    if (convexReport) return convexReport
    if (mockReportFallback) {
      return {
        _id: mockReportFallback.id,
        locationName: mockReportFallback.location,
        lat: mockReportFallback.coordinates[0],
        lng: mockReportFallback.coordinates[1],
        description: mockReportFallback.title,
        status: mockReportFallback.risk === 'High' ? 'CRITICAL' : 'VERIFIED',
        accuracy: mockReportFallback.confidence,
        detections: [mockReportFallback.classification],
        reasoning: 'Larval proliferation index elevated within standing water sector.',
        rawPhoto: mockReportFallback.rawPhoto,
        imageUri: mockReportFallback.rawPhoto,
        processedImage: mockReportFallback.rawPhoto,
        userName: 'Tanod Patrol',
        _creationTime: mockReportFallback.timestamp instanceof Date ? mockReportFallback.timestamp.getTime() : Date.now(),
      }
    }
    return null
  }, [convexReport, mockReportFallback])

  // Coordinates for hotspot
  const lat = assignment?.locationLat ?? reportObj?.lat ?? 10.68498
  const lng = assignment?.locationLng ?? reportObj?.lng ?? 122.53764
  const centerCoords: [number, number] = useMemo(() => [
    typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 10.68498,
    typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : 122.53764,
  ], [lat, lng])

  const locHierarchy = useReverseGeocode(lat, lng, assignment?.location || reportObj?.locationName)

  // Resolve Tanod Base & Location (Active assignment or preview of selected team)
  const currentTanodPost = useMemo(() => {
    if (isAssignment) {
      return getTanodPostInfo(assignment)
    }
    if (selectedTeamId && teams) {
      const selected = teams.find((t: any) => t._id === selectedTeamId)
      if (selected) return getTanodPostInfo(selected)
    }
    return null
  }, [isAssignment, assignment, selectedTeamId, teams])

  // Real-time Route Calculation via OSRM
  const [routeData, setRouteData] = useState<{
    distance: string
    duration: string
    coordinates: [number, number][]
    steps: string[]
  } | null>(null)

  useEffect(() => {
    if (!currentTanodPost?.coords || !centerCoords) {
      setRouteData(null)
      return
    }

    let isMounted = true

    async function calculateRoute() {
      const [startLat, startLng] = currentTanodPost!.coords
      const [endLat, endLng] = centerCoords

      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.routes && data.routes.length > 0 && isMounted) {
            const r = data.routes[0]
            const coords: [number, number][] = r.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            )
            const distKm = (r.distance / 1000).toFixed(1)
            const distM = Math.round(r.distance)
            const distStr = distM < 1000 ? `${distM} m` : `${distKm} km`
            const durationMin = Math.max(1, Math.round(r.duration / 60))
            const durationStr = `${durationMin} min${durationMin > 1 ? 's' : ''}`

            const steps: string[] = []
            if (r.legs && r.legs[0] && r.legs[0].steps) {
              r.legs[0].steps.forEach((step: any) => {
                if (step.maneuver) {
                  const type = step.maneuver.type
                  const street = step.name || 'Patrol Corridor'
                  if (type === 'depart') steps.push(`Depart from Tanod Post onto ${street}`)
                  else if (type === 'arrive') steps.push(`Arrive at target vector breeding site`)
                  else steps.push(`${type.charAt(0).toUpperCase() + type.slice(1)} onto ${street}`)
                }
              })
            }

            setRouteData({
              distance: distStr,
              duration: durationStr,
              coordinates: coords,
              steps: steps.length > 0 ? steps : ['Proceed directly along patrol corridor to hotspot coordinates.'],
            })
            return
          }
        }
      } catch (e) {
        console.warn('OSRM error, falling back to direct line', e)
      }

      // Fallback straight-line calculation
      if (isMounted) {
        const dLat = (endLat - startLat) * 111000
        const dLng = (endLng - startLng) * 111000 * Math.cos((startLat * Math.PI) / 180)
        const dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
        const distStr = dist < 1000 ? `${dist} m` : `${(dist / 1000).toFixed(1)} km`
        const etaMins = Math.max(1, Math.round(dist / 75))

        setRouteData({
          distance: distStr,
          duration: `${etaMins} mins patrol walk`,
          coordinates: [currentTanodPost!.coords, centerCoords],
          steps: [
            `Deploy Tanod patrol unit from ${currentTanodPost!.postName}`,
            `Proceed along designated barangay route (${distStr})`,
            `Arrive at targeted vector breeding hazard site`,
          ],
        })
      }
    }

    calculateRoute()

    return () => {
      isMounted = false
    }
  }, [currentTanodPost, centerCoords])

  // Images
  const rawImage = reportObj?.processedImage || reportObj?.imageUri || reportObj?.rawPhoto || assignment?.rawPhoto
  const imageUrl = useMemo(() => getValidImageUrl(rawImage) || '/assets/images/breeding-site.jpeg', [rawImage])

  const [imgDisplay, setImgDisplay] = useState(imageUrl)
  useEffect(() => {
    setImgDisplay(imageUrl)
  }, [imageUrl])

  // ESC key and body scroll lock for image modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false)
      }
    }
    if (isPreviewOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isPreviewOpen])

  // Map Bounds Calculation (Hook must be called before early returns)
  const mapPoints: [number, number][] = useMemo(() => {
    if (currentTanodPost?.coords) {
      return [currentTanodPost.coords, centerCoords]
    }
    return [centerCoords]
  }, [currentTanodPost, centerCoords])

  // Loading state
  if (
    convexAssignments === undefined &&
    convexReports === undefined &&
    !mockAssignmentFallback &&
    !mockReportFallback
  ) {
    return <DetailSkeleton />
  }

  // Not found
  if (!assignment && !reportObj) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto p-8 shadow-sm">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t('assignmentNotFound')}</h2>
        <p className="text-slate-500 mt-1 text-sm">
          No active assignment or pending hotspot record found matching ID &quot;{rawId}&quot;.
        </p>
        <Link
          href="/assignments"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl mt-5 text-sm font-semibold transition"
        >
          <ArrowLeft size={16} />
          {t('backToAssignments')}
        </Link>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!assignment) return
    setIsUpdating(true)
    try {
      if (!rawId.startsWith('#') && !rawId.startsWith('assign-')) {
        await updateStatus({ assignmentId: assignment._id as Id<"assignments">, status: newStatus })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDispatch = async () => {
    if (!selectedTeamId || !reportObj) return
    setIsDispatching(true)
    try {
      if (!rawId.startsWith('#')) {
        await createAssignment({
          reportId: reportObj._id as any,
          teamId: selectedTeamId as any,
        })
      }
      setDispatchSuccess(true)
      setTimeout(() => {
        router.push('/assignments')
      }, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setIsDispatching(false)
    }
  }

  const statusLabel = isAssignment ? (assignment.status || 'Assigned') : 'Pending Dispatch'
  const confidenceScore = extractConfidenceScore(reportObj || assignment)
  const barangayName = assignment?.barangay || assignment?.region || locHierarchy.barangay || 'Calumpang'
  const leaderName = assignment?.memberNames?.[assignment.memberIds?.indexOf(assignment.leaderId) ?? -1] || assignment?.memberNames?.[0] || 'Tanod Team Leader'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Toast */}
      {dispatchSuccess && (
        <div className="fixed top-5 right-5 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 size={18} />
          Tanod Team Dispatched Successfully! Redirecting...
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 p-7 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/assignments"
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white border border-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-xs font-bold text-primary-400 uppercase tracking-wider">
              {isAssignment ? 'Tanod Field Assignment & Wayfinding' : 'Pending Vector Hotspot Dispatch'}
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {isAssignment ? assignment.teamName : (reportObj.locationName || 'Vector Breeding Hotspot')}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isAssignment
                  ? 'bg-primary-500/20 text-primary-300 border-primary-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  }`}>
                  {barangayName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {locHierarchy.formatted}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {assignment?.assignedAt
                    ? new Date(assignment.assignedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : reportObj?._creationTime
                      ? new Date(reportObj._creationTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAssignment && assignment.status !== 'Completed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('Completed')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all text-sm font-bold active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Mark as Controlled & Completed
                </button>
              )}
              {isPendingReport && (
                <span className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold">
                  <Clock size={15} /> Awaiting Tanod Dispatch
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 px-7 py-3.5 bg-white/5 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs">
          {isAssignment ? (
            <>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-400" />
                <span className="text-white/60">Field Unit:</span>
                <span className="font-bold text-white">{assignment.memberIds?.length || 2} Officers</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-white/60">Leader:</span>
                <span className="font-semibold text-white/90">{leaderName}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary-400" />
              <span className="text-white/60">Reporting Tanod:</span>
              <span className="font-bold text-white">{reportObj.userName || 'Tanod Patrol Officer'}</span>
            </div>
          )}
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-white/60">Confidence:</span>
            <span className="font-bold text-amber-300">{confidenceScore}%</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAssignment ? (assignment.status === 'Completed' ? 'bg-emerald-400' : 'bg-primary-400') : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-bold text-white uppercase text-[11px]">{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Location & Map Pointdown with Direction Routing */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Route className="h-4 w-4 text-primary-600" />
                {currentTanodPost ? 'Tanod Dispatch Route & Wayfinding Pointdown' : 'Target Sector Map Location Pointdown'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                Molo District
              </span>
            </div>

            {/* Address & Waypoint Banner */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">{locHierarchy.formatted}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Target GPS: {centerCoords[0].toFixed(5)}, {centerCoords[1].toFixed(5)}
                </p>
                {currentTanodPost && (
                  <p className="text-xs text-primary-700 font-semibold mt-1 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary-600" />
                    <span>Origin: {currentTanodPost.postName}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentTanodPost ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${currentTanodPost.coords[0]},${currentTanodPost.coords[1]}&destination=${centerCoords[0]},${centerCoords[1]}&travelmode=walking`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Navigation size={13} /> Live Directions <ExternalLink size={12} />
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${centerCoords[0]},${centerCoords[1]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-primary-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    Google Maps <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {/* Dedicated Interactive Leaflet Map with Route Wayfinding */}
            <div className="w-full h-80 md:h-96 rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
              <MapContainer
                center={centerCoords}
                zoom={16}
                className="w-full h-full z-0"
                zoomControl={false}
              >
                <TileLayer
                  attribution="&copy; Stadia Maps"
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                />

                {/* Hotspot Pin */}
                <Marker
                  position={centerCoords}
                  icon={getCustomPin(isAssignment ? (assignment.reportStatus || assignment.status) : (reportObj?.status || 'PENDING'))}
                />

                {/* Tanod Team Pin */}
                {currentTanodPost && (
                  <Marker
                    position={currentTanodPost.coords}
                    icon={getTanodPin(currentTanodPost.teamName)}
                  />
                )}

                {/* Route Polyline */}
                {routeData?.coordinates && routeData.coordinates.length > 0 && (
                  <>
                    <Polyline
                      positions={routeData.coordinates}
                      pathOptions={{ color: '#1d4ed8', weight: 6, opacity: 0.9 }}
                    />
                    <Polyline
                      positions={routeData.coordinates}
                      pathOptions={{ color: '#60a5fa', weight: 3, opacity: 1, dashArray: '8, 8' }}
                    />
                  </>
                )}

                <FitMapBounds points={mapPoints} />
              </MapContainer>

              {/* Map Legend Overlay */}
              <div className="absolute top-3 right-3 z-[400] bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-white text-[11px] space-y-1.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold">Target Hotspot</span>
                </div>
                {currentTanodPost && (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-semibold">{currentTanodPost.teamName}</span>
                  </div>
                )}
              </div>

              {/* Telemetry pill */}
              <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[11px] font-mono flex items-center gap-1.5 shadow-md">
                <Crosshair size={12} className="text-primary-400" />
                <span>{centerCoords[0].toFixed(5)}, {centerCoords[1].toFixed(5)}</span>
              </div>
            </div>

            {/* Live Navigation & Wayfinding Directions HUD */}
            {currentTanodPost && (
              <div className="bg-gradient-to-br from-slate-900 to-primary-950 rounded-2xl p-5 text-white border border-primary-800/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-400/30">
                      <Compass className="h-4 w-4 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-white">
                        {isAssignment ? 'Assigned Tanod Response Corridor' : 'Simulated Response Corridor (Selected Team)'}
                      </h4>
                      <p className="text-[11px] text-white/60">
                        From {currentTanodPost.postName} to Sector Breeding Target
                      </p>
                    </div>
                  </div>
                  {routeData && (
                    <div className="text-right">
                      <span className="text-xs font-black text-primary-300 bg-primary-950/80 px-2.5 py-1 rounded-lg border border-primary-500/30">
                        {routeData.distance} • {routeData.duration}
                      </span>
                    </div>
                  )}
                </div>

                {/* Wayfinding Steps */}
                {routeData?.steps && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                        Turn-by-Turn Navigation Waypoints
                      </span>
                      {routeData.steps.length > 2 && (
                        <button
                          onClick={() => setShowAllSteps(!showAllSteps)}
                          className="text-[11px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
                        >
                          {showAllSteps ? 'Show Less' : `View All (${routeData.steps.length} Steps)`}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {(showAllSteps ? routeData.steps : routeData.steps.slice(0, 2)).map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <div className="w-5 h-5 rounded-full bg-primary-500/30 border border-primary-400/40 flex items-center justify-center text-[10px] font-black text-primary-300 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="pt-0.5">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Surveillance Imagery Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Field Surveillance Imagery</span>
              </div>
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500 flex items-center gap-1 text-xs font-bold"
              >
                <Maximize2 size={13} /> Full Screen
              </button>
            </div>
            <div
              className="relative h-64 md:h-80 bg-slate-950 flex items-center justify-center cursor-pointer group"
              onClick={() => setIsPreviewOpen(true)}
            >
              <img
                src={imgDisplay}
                alt={locHierarchy.formatted}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                onError={() => setImgDisplay('/assets/images/breeding-site.jpeg')}
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15">
                <Maximize2 size={12} className="text-primary-400" />
                <span>Click to expand image</span>
              </div>
            </div>
          </div>

          {/* Assigned Personnel (Active Assignments) */}
          {isAssignment && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-600" />
                Assigned Field Tanod Personnel
              </h3>
              <div className="space-y-2.5">
                {(assignment.memberNames || ['Tanod Officer R. Santos', 'Tanod Officer J. Dela Cruz']).map((name: string, i: number) => {
                  const isLeader = i === 0
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3.5 rounded-2xl ${isLeader ? 'bg-amber-50/80 border border-amber-200/70' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isLeader ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 text-slate-700'}`}>
                        {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{name}</p>
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {isLeader ? 'Lead Patrol Officer' : 'Field Tanod Officer'}
                        </span>
                      </div>
                      {isLeader && <Shield size={16} className="text-amber-500" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Incident Context */}
          {(assignment?.reportDescription || reportObj?.description) && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-600" />
                Field Observation Context
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed pl-6">
                {assignment?.reportDescription || reportObj?.description}
              </p>
            </div>
          )}

          {/* AI Vector Diagnostic */}
          {(assignment?.reportReasoning || reportObj?.reasoning) && (
            <div className="bg-gradient-to-br from-slate-900 to-primary-950 rounded-3xl p-6 text-white shadow-xl space-y-3 border border-primary-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-400/30">
                  <Bot className="h-4 w-4" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wider text-white">AI Vector Diagnostic</h4>
              </div>
              <p className="text-sm font-medium leading-relaxed italic text-slate-100 pl-8">
                &quot;{assignment?.reportReasoning || reportObj?.reasoning}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">

          {/* Quick Action: Dispatch Tanod Team (Pending View) */}
          {isPendingReport && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-100 text-primary-800">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Dispatch Response Team</h3>
                  <p className="text-xs text-slate-500">Deploy a Barangay Tanod Unit</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Select Tanod Team <span className="text-rose-500">*</span>
                  </label>
                  {(teams || []).length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No Tanod teams available. Create teams in the assignments dashboard.
                    </div>
                  ) : (
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition cursor-pointer"
                    >
                      <option value="">Select Team...</option>
                      {(teams || []).map((tm: any) => (
                        <option key={tm._id} value={tm._id}>
                          {tm.name} — Brgy. {tm.barangay || tm.region || 'Calumpang'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedTeamId && currentTanodPost && (
                  <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-blue-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      <span>{currentTanodPost.teamName}</span>
                    </p>
                    <p className="text-blue-700">
                      Patrol Post: <span className="font-semibold">{currentTanodPost.postName}</span>
                    </p>
                    {routeData && (
                      <p className="text-blue-800 font-bold pt-1">
                        Est. Dispatch Distance: {routeData.distance} ({routeData.duration})
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleDispatch}
                  disabled={!selectedTeamId || isDispatching}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 transition-all active:scale-[0.98]"
                >
                  {isDispatching ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Confirm Dispatch & Deploy
                </button>
              </div>
            </div>
          )}

          {/* Status Controls (Active Assignment) */}
          {isAssignment && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <h3 className="font-black text-slate-900 mb-3 text-xs uppercase tracking-wider">Assignment Status</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {['Assigned', 'In Progress', 'Completed'].map((s) => {
                  const isActive = assignment.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={isUpdating}
                      className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${isActive
                        ? s === 'Completed' ? 'bg-emerald-600 text-white shadow-sm' : s === 'In Progress' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hotspot Intelligence */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Building className="h-4 w-4 text-primary-600" />
              Hotspot Intelligence
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Confidence Level</span>
                <span className="font-bold text-slate-900">{confidenceScore}% Verified</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Operational Status</span>
                <span className="font-bold text-slate-900">{statusLabel}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Sector Zone</span>
                <span className="font-bold text-slate-900">Molo — {barangayName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">GPS Telemetry</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={13} /> Calibrated
                </span>
              </div>
            </div>
          </div>

          {/* Classified Vectors */}
          {reportObj?.detections && reportObj.detections.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                Classified Breeding Vectors
              </h3>
              <div className="flex flex-wrap gap-2">
                {reportObj.detections.map((d: string, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compact Image Modal */}
      {isPreviewOpen && imgDisplay && (
        <div
          className="fixed inset-0 z-[500] bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <ImageIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Surveillance Image</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full truncate">
                  {locHierarchy.formatted}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Compact Image Body */}
            <div className="relative bg-slate-950 p-2 flex items-center justify-center h-64 sm:h-72">
              <img
                src={imgDisplay}
                alt={locHierarchy.formatted}
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
                }}
              />
            </div>

            {/* Compact Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                <Zap className="h-3 w-3" />
                {confidenceScore}% AI Confidence
              </span>
              <span className="text-[10px] text-slate-400">
                Press ESC to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
