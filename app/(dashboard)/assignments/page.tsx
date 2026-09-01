'use client'

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from 'next/navigation'
import {
  Search,
  FileText,
  CheckCircle2,
  Eye,
  X,
  UserPlus,
  Users,
  LayoutGrid,
  List,
  MapPin,
  Clock,
  ChevronRight,
  Plus,
  Check,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  User,
  Calendar,
  Zap,
  AlertCircle,
  Shield,
  Bot,
  Building,
  Sparkles
} from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useLanguage } from '../../../src/lib/translations'
import { useReverseGeocode, getLocationHierarchy, extractConfidenceScore } from '../../../src/lib/geoUtils'
import { mockAssignments, mockReports } from '../../../src/lib/mockData'
import Link from "next/link"

// Helper to validate and create image URL from base64 or path (matching reports/page.tsx logic)
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

  const normalized = cleanImg.replace(/[\s\r\n]/g, '')
  let mime = 'image/jpeg'
  if (normalized.startsWith('iVBORw0KGgo')) mime = 'image/png'
  else if (normalized.startsWith('R0lGOD')) mime = 'image/gif'
  else if (normalized.startsWith('UklGR')) mime = 'image/webp'

  return `data:${mime};base64,${normalized}`
}

// Helper for relative time
function getTimeSince(timestamp: string | number | undefined) {
  if (!timestamp) return 'Unknown'
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)
  if (isNaN(date.getTime())) return 'Unknown'
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function getDisplayImage(report: any): string | null {
  if (!report) return null
  const img = report.imageUri || report.processedImage || report.rawPhoto || report.imageUrl || ''
  return getValidImageUrl(img)
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    case 'In Progress': return 'bg-blue-50 text-blue-700 border border-blue-200/60'
    default: return 'bg-amber-50 text-amber-700 border border-amber-200/60'
  }
}

function getReportStatusColor(status: string) {
  if (status === 'CRITICAL' || status === 'critical') return 'bg-rose-50 text-rose-700 border border-rose-200/60'
  if (status === 'VERIFIED' || status === 'verified') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
  return 'bg-slate-100 text-slate-600 border border-slate-200/60'
}

function getRiskLevel(status: string) {
  const s = status?.toUpperCase()
  if (s === 'CRITICAL' || s === 'HIGH') return { label: 'Critical', color: 'text-rose-600', bg: 'bg-rose-100', icon: AlertCircle }
  if (s === 'VERIFIED' || s === 'LOW') return { label: 'Verified', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Shield }
  return { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock }
}

function PendingReportCard({
  report,
  onAssign
}: {
  report: any
  onAssign: (reportId: string) => void
}) {
  const locHierarchy = useReverseGeocode(report.lat, report.lng, report.locationName || report.location)
  const rawImageUrl = useMemo(() => getDisplayImage(report), [report])
  const [imgSrc, setImgSrc] = useState(rawImageUrl)

  useEffect(() => {
    setImgSrc(rawImageUrl)
  }, [rawImageUrl])

  const riskLevel = getRiskLevel(report.status)
  const timeSince = getTimeSince(report._creationTime)
  const confidenceScore = extractConfidenceScore(report)

  return (
    <article className="bg-white rounded-3xl border border-slate-200/80 p-3.5 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 hover:border-primary-300 transition-[transform,box-shadow,border-color] duration-300 group flex flex-col justify-between">
      <div>
        {/* Image at top */}
        <Link href={`/assignments/${report._id}`} className="block relative w-full aspect-[16/9] min-h-40 bg-slate-900 rounded-2xl overflow-hidden mb-4 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
          <img
            src={imgSrc || '/assets/images/breeding-site.jpeg'}
            alt={locHierarchy.formatted}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
            onError={() => {
              if (imgSrc && imgSrc.startsWith('data:image/jpeg;base64,')) {
                setImgSrc(imgSrc.replace('data:image/jpeg;base64,', 'data:image/png;base64,'))
              } else {
                setImgSrc('/assets/images/breeding-site.jpeg')
              }
            }}
          />
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/80">
            <Bot size={13} />
          </div>

          {/* Status badges overlay */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase ${getReportStatusColor(report.status)} backdrop-blur-sm`}>
              {report.status || 'Verified'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${riskLevel.bg} ${riskLevel.color} backdrop-blur-sm`}>
              <riskLevel.icon size={10} />
              {riskLevel.label}
            </span>
          </div>

          {/* Time since */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <Clock size={10} className="text-white/70" />
            <span className="text-[9px] text-white/90 font-medium">{timeSince}</span>
          </div>
        </Link>

        {/* Content */}
        <div>
          <Link href={`/assignments/${report._id}`}>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1 cursor-pointer">
              {locHierarchy.formatted}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {report.description || 'Verified vector breeding habitat awaiting tanod dispatch.'}
          </p>

          <div className="flex items-center flex-wrap gap-2.5 mt-2.5 text-[11px] text-slate-500">
            {report.userName && (
              <span className="flex items-center gap-1">
                <User size={11} className="text-slate-400" /> {report.userName}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80">
              <Zap size={11} className="text-amber-500" /> {confidenceScore}% AI Confidence
            </span>
          </div>

          {report.detections && report.detections.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {report.detections.slice(0, 2).map((d: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4">
        <Link
          href={`/assignments/${report._id}`}
          className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          title="View Surveillance & Map"
        >
          <Eye size={14} />
        </Link>
        <button
          onClick={() => onAssign(report._id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 active:scale-[0.98]"
        >
          <UserPlus size={14} />
          Dispatch Team
        </button>
      </div>
    </article>
  )
}

// Subcomponent for Active Assignment Card
function AssignmentCard({
  assignment,
  report,
  t
}: {
  assignment: any
  report: any
  t: (key: string) => string
}) {
  const lat = assignment.locationLat || report?.lat
  const lng = assignment.locationLng || report?.lng
  const locHierarchy = useReverseGeocode(lat, lng, assignment.location || report?.locationName)
  const rawImageUrl = useMemo(() => getDisplayImage(report || assignment), [report, assignment])
  const [imgSrc, setImgSrc] = useState(rawImageUrl)

  useEffect(() => {
    setImgSrc(rawImageUrl)
  }, [rawImageUrl])

  const timeSince = report ? getTimeSince(report._creationTime) : 'Recent'
  const riskLevel = report ? getRiskLevel(report.status) : { label: 'Active', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock }
  const barangayName = assignment.barangay || assignment.region || 'Calumpang'
  const confidenceScore = extractConfidenceScore(report || assignment)

  return (
    <Link
      href={`/assignments/${assignment._id}`}
      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 hover:border-primary-300 transition-[transform,box-shadow,border-color] duration-300 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <div>
        {/* Image Header */}
        <div className="relative aspect-[16/9] min-h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
          <img
            src={imgSrc || '/assets/images/breeding-site.jpeg'}
            alt={locHierarchy.formatted}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
            onError={() => {
              if (imgSrc && imgSrc.startsWith('data:image/jpeg;base64,')) {
                setImgSrc(imgSrc.replace('data:image/jpeg;base64,', 'data:image/png;base64,'))
              } else {
                setImgSrc('/assets/images/breeding-site.jpeg')
              }
            }}
          />
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/80">
            <Bot size={13} />
          </div>

          {/* Overlay status badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg uppercase ${getStatusColor(assignment.status)} backdrop-blur-sm`}>
              {assignment.status}
            </span>
            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg uppercase ${riskLevel.bg} ${riskLevel.color} backdrop-blur-sm flex items-center gap-1`}>
              <riskLevel.icon size={10} />
              {riskLevel.label}
            </span>
          </div>

          {/* Time since */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <Clock size={10} className="text-white/70" />
            <span className="text-[9px] text-white/90 font-medium">{timeSince}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                {assignment.teamName?.charAt(0) || "T"}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition-colors truncate">
                  {assignment.teamName || 'Tanod Unit'}
                </p>
                <p className="text-[11px] text-primary-700 font-semibold">
                  Brgy. {barangayName}
                </p>
              </div>
            </div>
          </div>

          {/* Resolved Barangay Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-2">
            <MapPin size={13} className="shrink-0 text-rose-500" />
            <span className="truncate">{locHierarchy.formatted}</span>
          </div>

          {/* Report description */}
          {report?.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
              {report.description}
            </p>
          )}

          {/* Detections chips */}
          {report?.detections && report.detections.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {report.detections.slice(0, 2).map((d: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metadata footer */}
      <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
          {report?.userName && (
            <span className="flex items-center gap-1">
              <User size={11} className="text-slate-400" /> {report.userName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80">
            <Zap size={11} className="text-amber-500" /> {confidenceScore}% Confidence
          </span>
        </div>
        <ChevronRight size={14} className="text-slate-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// Subcomponent for Assignment List Row
function AssignmentListRow({
  assignment,
  report,
  onComplete,
  t
}: {
  assignment: any
  report: any
  onComplete: (id: string) => void
  t: (key: string) => string
}) {
  const lat = assignment.locationLat || report?.lat
  const lng = assignment.locationLng || report?.lng
  const locHierarchy = useReverseGeocode(lat, lng, assignment.location || report?.locationName)
  const riskLevel = report ? getRiskLevel(report.status) : { label: 'Active', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock }
  const barangayName = assignment.barangay || assignment.region || 'Calumpang'
  const confidenceScore = extractConfidenceScore(report || assignment)

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-primary-50/40 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-800 text-xs font-black">
            {assignment.teamName?.charAt(0) || "T"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{assignment.teamName || 'Tanod Unit'}</p>
            <p className="text-[11px] text-primary-700 font-semibold">Brgy. {barangayName}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div>
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <MapPin size={12} className="text-rose-500 shrink-0" />
            {locHierarchy.formatted}
          </span>
          {report?.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{report.description}</p>
          )}
        </div>
      </td>
      <td className="p-4">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${getStatusColor(assignment.status)}`}>
          {assignment.status}
        </span>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${getReportStatusColor(assignment.reportStatus || report?.status)}`}>
              {assignment.reportStatus || report?.status || "VERIFIED"}
            </span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${riskLevel.bg} ${riskLevel.color}`}>
              {riskLevel.label}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
            <Zap size={10} className="text-amber-500" /> {confidenceScore}% Confidence
          </span>
        </div>
      </td>
      <td className="p-4">
        <div>
          <span className="text-xs text-slate-600 font-medium">
            {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : '—'}
          </span>
          {report?._creationTime && (
            <p className="text-[10px] text-slate-400">{getTimeSince(report._creationTime)}</p>
          )}
        </div>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/assignments/${assignment._id}`}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
            title="View Assignment"
          >
            <Eye size={15} />
          </Link>
          {assignment.status !== "Completed" && (
            <button
              onClick={() => onComplete(assignment._id)}
              className="p-2 hover:bg-emerald-50 rounded-xl transition-colors text-slate-400 hover:text-emerald-600"
              title="Mark Completed"
            >
              <CheckCircle2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function AssignmentsPage() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get('reportId')
  const { t } = useLanguage()

  const convexAssignments = useQuery(api.assignments.getActiveAssignments)
  const teams = useQuery(api.assignments.getAllTeams)
  const convexReports = useQuery(api.reports.getAllReports)
  const createAssignment = useMutation(api.assignments.createAssignment)
  const createTeam = useMutation(api.assignments.addTeam)
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [activeTab, setActiveTab] = useState<'pending' | 'assignments'>('pending')

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(!!reportId)
  const [assignForm, setAssignForm] = useState({ teamId: "", reportIdLocal: reportId || "" })

  // Create team modal with barangay choice
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamForm, setTeamForm] = useState({
    name: "",
    barangay: "Calumpang",
  })
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  // Unified reports matching reports/page.tsx behavior
  const allReports = useMemo(() => {
    if (convexReports === undefined) return []
    if (convexReports && convexReports.length > 0) {
      return convexReports.map((r: any) => ({
        ...r,
        _id: r._id,
        _creationTime: r._creationTime,
        locationName: r.locationName || r.location,
        userName: r.userName || 'Tanod Patrol',
        description: r.description || 'Vector breeding site awaiting tanod dispatch.',
        status: r.status || (r.verified ? 'VERIFIED' : 'PENDING'),
        accuracy: r.accuracy || r.confidence,
        detections: r.detections || [],
        lat: r.lat,
        lng: r.lng,
        verified: r.verified !== false,
        imageUri: r.imageUri || r.processedImage || r.rawPhoto || '',
        processedImage: r.processedImage || r.imageUri || r.rawPhoto || '',
        rawPhoto: r.rawPhoto || r.processedImage || r.imageUri || '',
      }))
    }
    if (convexReports !== undefined && convexReports.length === 0) {
      return mockReports.map(m => ({
        _id: m.id as any,
        _creationTime: m.timestamp instanceof Date ? m.timestamp.getTime() : Date.now(),
        locationName: m.location,
        userName: 'Tanod Patrol',
        description: `${m.title} - ${m.classification}`,
        status: m.risk === 'High' ? 'CRITICAL' : 'VERIFIED',
        accuracy: m.confidence,
        detections: [m.classification],
        lat: m.coordinates[0],
        lng: m.coordinates[1],
        verified: true,
        imageUri: m.rawPhoto,
        processedImage: m.rawPhoto,
        rawPhoto: m.rawPhoto,
      }))
    }
    return []
  }, [convexReports])

  const assignments = convexAssignments && convexAssignments.length > 0 ? convexAssignments : mockAssignments.map((a, idx) => {
    const rep = mockReports.find(r => r.id === a.reportId) || mockReports[idx % mockReports.length]
    return {
      _id: a.id as any,
      reportId: a.reportId as any,
      teamId: 'team-mock' as any,
      teamName: a.assignee?.team || `Tanod Team ${idx === 0 ? 'Calumpang' : 'South Fundidor'}`,
      location: rep?.location || 'Zone 3, Brgy. Calumpang',
      barangay: (a.assignee?.team?.includes('South') || rep?.location?.includes('South')) ? 'South Fundidor' : 'Calumpang',
      region: (a.assignee?.team?.includes('South') || rep?.location?.includes('South')) ? 'South Fundidor' : 'Calumpang',
      status: a.status === 'Pending' ? 'Assigned' : a.status,
      reportStatus: rep?.risk === 'High' ? 'CRITICAL' : 'VERIFIED',
      assignedAt: Date.now() - 1000 * 60 * 60 * (idx + 1) * 3,
      locationLat: rep?.coordinates?.[0] || 10.68498,
      locationLng: rep?.coordinates?.[1] || 122.53764,
    }
  })

  // ✅ IMPORTANT: Define assignedReportIds BEFORE pendingReports
  const assignedReportIds = useMemo(() => new Set((assignments || []).map((a: any) => a.reportId)), [assignments])

  // Reports that are not yet assigned to any team
  const pendingReports = useMemo(() => {
    return (allReports || []).filter((r: any) => !assignedReportIds.has(r._id))
  }, [allReports, assignedReportIds])

  const filtered = (assignments || []).filter((a: any) => {
    const matchesSearch =
      (a.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.teamName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.barangay || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.region || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "All" || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: pendingReports.length,
    total: assignments?.length || 0,
    inProgress: assignments?.filter((a: any) => a.status === "In Progress").length || 0,
    completed: assignments?.filter((a: any) => a.status === "Completed").length || 0,
  }

  const handleCreateTeam = async () => {
    if (!teamForm.name || !teamForm.barangay) return
    setIsCreatingTeam(true)
    try {
      await createTeam({
        name: teamForm.name,
        barangay: teamForm.barangay,
        region: teamForm.barangay, // Keep both for Convex DB backwards compatibility
        avatar: teamForm.name.charAt(0).toUpperCase(),
        leaderId: "",
        memberIds: [],
        memberNames: [],
      })
      setShowCreateTeam(false)
      setTeamForm({ name: "", barangay: "Calumpang" })
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const openAssignForReport = (targetReportId: string) => {
    setAssignForm(f => ({ ...f, reportIdLocal: targetReportId }))
    setShowAssignModal(true)
  }

  const handleCompleteAssignment = async (id: string) => {
    try {
      await updateStatus({ assignmentId: id as any, status: "Completed" })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in-up max-w-[1600px] w-full mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {t('fieldAssignments')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800 border border-primary-200">
              Molo District Tanod Response
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{t('manageDispatch')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTeam(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all font-bold shadow-md shadow-primary-500/20 active:scale-[0.98] text-sm"
          >
            <Users size={16} /> {t('addTeam')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 mb-5 shrink-0 w-full sm:w-fit overflow-x-auto" role="tablist" aria-label="Assignment categories">
        <button
          onClick={() => setActiveTab('pending')}
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <AlertTriangle size={14} className={activeTab === 'pending' ? 'text-amber-500' : 'text-slate-400'} />
          Pending Assignments
          {stats.pending > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
              {stats.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          role="tab"
          aria-selected={activeTab === 'assignments'}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'assignments' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <ClipboardList size={14} className={activeTab === 'assignments' ? 'text-primary-600' : 'text-slate-400'} />
          Active Assignments
          {stats.total > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'assignments' ? 'bg-primary-100 text-primary-800' : 'bg-slate-200 text-slate-600'}`}>
              {stats.total}
            </span>
          )}
        </button>
      </div>

      {/* ─── PENDING REPORTS TAB ─── */}
      {activeTab === 'pending' && (
        <div className="flex-1 overflow-y-auto">
          {pendingReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <p className="font-bold text-base text-slate-800">All Hotspots Dispatched!</p>
              <p className="text-xs text-slate-400 mt-1">There are no pending verified reports awaiting team assignment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pendingReports.map((report: any) => (
                <PendingReportCard
                  key={report._id}
                  report={report}
                  onAssign={openAssignForReport}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ASSIGNMENTS TAB ─── */}
      {activeTab === 'assignments' && (
        <>
          {/* Filters + View toggle */}
          <div className="flex flex-wrap items-center gap-3 mb-5 shrink-0 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex-1 min-w-[220px] relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team name, barangay, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto">
              {["All", "Assigned", "In Progress", "Completed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterStatus === s ? "bg-white text-primary-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Card View"
                aria-label="Card view"
                aria-pressed={viewMode === 'card'}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="List View"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((a: any) => {
                  const report = (convexReports || []).find((r: any) => r._id === a.reportId) ||
                    (mockReports || []).find((r: any) => r.id === a.reportId) ||
                    allReports?.find((r: any) => r._id === a.reportId)
                  return (
                    <AssignmentCard
                      key={a._id}
                      assignment={a}
                      report={report}
                      t={t}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="flex-1 overflow-x-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Team / Unit</th>
                    <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Barangay Location</th>
                    <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Risk Level</th>
                    <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="text-right p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a: any) => {
                    const report = (convexReports || []).find((r: any) => r._id === a.reportId) ||
                      (mockReports || []).find((r: any) => r.id === a.reportId) ||
                      allReports?.find((r: any) => r._id === a.reportId)
                    return (
                      <AssignmentListRow
                        key={a._id}
                        assignment={a}
                        report={report}
                        onComplete={handleCompleteAssignment}
                        t={t}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText size={28} className="text-slate-400" />
              </div>
              <p className="font-bold text-base text-slate-800">{t('noAssignments')}</p>
              <p className="text-xs text-slate-400 mt-1">No matching assignments found for this filter.</p>
            </div>
          )}
        </>
      )}

      {/* ─── Create Team Modal (Updated with Barangay: Calumpang, South Fundidor) ─── */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 text-primary-800 rounded-2xl">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Add Response Team</h3>
                  <p className="text-xs text-slate-500">Deploy a Tanod field team to a Barangay</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTeam(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                  placeholder="e.g. Tanod Team Alpha"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Barangay <span className="text-rose-500">*</span>
                </label>
                <select
                  value={teamForm.barangay}
                  onChange={(e) => setTeamForm(f => ({ ...f, barangay: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition cursor-pointer"
                >
                  <option value="Calumpang">Brgy. Calumpang</option>
                  <option value="South Fundidor">Brgy. South Fundidor</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Designate primary operational sector in Molo District.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                onClick={() => setShowCreateTeam(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                disabled={!teamForm.name || !teamForm.barangay || isCreatingTeam}
                onClick={handleCreateTeam}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isCreatingTeam ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Users size={15} />
                )}
                Save Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Modal ─── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 text-primary-800 rounded-2xl">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Dispatch Response Team</h3>
                  <p className="text-xs text-slate-500">Assign a verified vector hotspot to a Tanod unit</p>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Report ID</label>
                <input
                  type="text"
                  value={assignForm.reportIdLocal}
                  onChange={(e) => setAssignForm(f => ({ ...f, reportIdLocal: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                  placeholder="e.g. #INC-2026-001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Assigned Tanod Team</label>
                {(teams || []).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <Users size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">No Tanod teams registered yet</p>
                    <button
                      onClick={() => { setShowAssignModal(false); setShowCreateTeam(true) }}
                      className="mt-2 text-xs font-bold text-primary-700 hover:underline"
                    >
                      + Create a Team for Calumpang / South Fundidor
                    </button>
                  </div>
                ) : (
                  <select
                    value={assignForm.teamId}
                    onChange={(e) => setAssignForm(f => ({ ...f, teamId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition cursor-pointer"
                  >
                    <option value="">Select Tanod Team...</option>
                    {(teams || []).map((tm: any) => (
                      <option key={tm._id} value={tm._id}>
                        {tm.name} — Brgy. {tm.barangay || tm.region || 'Calumpang'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                disabled={!assignForm.reportIdLocal || !assignForm.teamId}
                onClick={async () => {
                  try {
                    await createAssignment({
                      reportId: assignForm.reportIdLocal as any,
                      teamId: assignForm.teamId as any,
                    })
                    setShowAssignModal(false)
                    setAssignForm({ teamId: "", reportIdLocal: "" })
                  } catch (e) {
                    console.error(e)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <UserPlus size={15} /> Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
