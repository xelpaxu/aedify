'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  Share2,
  Printer,
  Download,
  Bot,
  Zap,
  Image as ImageIcon,
  Maximize2,
  X,
  Check,
  Loader2,
  FileText,
  Info,
  Pencil,
  ChevronDown,
  Crosshair,
  Grid,
  List,
  Save,
  RefreshCw,
  Map,
  Navigation,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Building,
  Sparkles,
  ExternalLink,
  Copy,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import L from 'leaflet'
import { getLocationHierarchy, formatReportLocation, useReverseGeocode } from '../../../../src/lib/geoUtils'
import { mockReports } from '../../../../src/lib/mockData'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

function getCustomPin(status?: string, verified?: boolean) {
  const s = status?.toUpperCase()
  let iconUrl = '/assets/images/pin_safe.png'
  let glowColor = 'rgba(16, 185, 129, 0.45)'
  if (s === 'CRITICAL' || s === 'HIGH') {
    iconUrl = '/assets/images/pin_critical.png'
    glowColor = 'rgba(239, 68, 68, 0.55)'
  } else if (s === 'MODERATE' || s === 'MEDIUM' || s === 'PENDING' || !verified) {
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

function RecenterMap({ coords }: { coords: [number, number] }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (map && coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
      map.setView(coords, 16)
    }
  }, [coords, map])
  return null
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8 animate-pulse">
      <div className="relative overflow-hidden rounded-2xl bg-slate-200 h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-48" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-32" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-24" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-24" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Modal Component
function EditReportModal({
  isOpen,
  onClose,
  report,
  onSave,
  isSaving
}: {
  isOpen: boolean
  onClose: () => void
  report: any
  onSave: (data: any) => void
  isSaving: boolean
}) {
  const [formData, setFormData] = useState({
    locationName: '',
    description: '',
    status: '',
    accuracy: 0,
    reasoning: '',
    lat: 0,
    lng: 0,
    userName: ''
  })

  useEffect(() => {
    if (report) {
      const loc = getLocationHierarchy(report)
      setFormData({
        locationName: loc.formatted,
        description: report.description || '',
        status: report.status || 'pending',
        accuracy: typeof report.accuracy === 'number' ? report.accuracy : 85,
        reasoning: report.reasoning || '',
        lat: report.lat || 10.68498,
        lng: report.lng || 122.53764,
        userName: report.userName || ''
      })
    }
  }, [report])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleAutoDetect = () => {
    const loc = getLocationHierarchy({ lat: formData.lat, lng: formData.lng })
    setFormData(prev => ({
      ...prev,
      locationName: loc.formatted
    }))
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 rounded-xl text-primary-800">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Edit Vector Report</h2>
              <p className="text-xs text-slate-500">Update coordinates and verified location data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Auto Resolve Banner */}
            <div className="flex items-center justify-between p-4 bg-primary-50/70 rounded-2xl border border-primary-200/60">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary-900">GPS Barangay Resolver</p>
                  <p className="text-[11px] text-primary-700">Auto-detects Barangay, District, and City from GPS.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoDetect}
                className="px-3.5 py-1.5 bg-white border border-primary-300 rounded-xl text-primary-800 text-xs font-bold hover:bg-primary-50 transition-colors shadow-sm"
              >
                Auto-Format
              </button>
            </div>

            <div className="space-y-4">
              {/* Formatted Location Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Full Location (Barangay, District, City) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                  placeholder="e.g., Brgy. Calumpang, Molo, Iloilo City"
                  required
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Latitude
                  </label>
                  <input
                    type="number"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: Number(e.target.value) })}
                    step="any"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Longitude
                  </label>
                  <input
                    type="number"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: Number(e.target.value) })}
                    step="any"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Status & Accuracy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition cursor-pointer"
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="verified">✅ Verified</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Confidence (%)
                  </label>
                  <input
                    type="number"
                    value={formData.accuracy}
                    onChange={(e) => setFormData({ ...formData, accuracy: Number(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition resize-none"
                  placeholder="Incident details..."
                />
              </div>

              {/* AI Reasoning */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  AI Vector Analysis Reasoning
                </label>
                <textarea
                  value={formData.reasoning}
                  onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition resize-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const convexReport = useQuery(api.reports.getReport, {
    id: (reportId && !reportId.startsWith('#INC')) ? (reportId as Id<"reports">) : ("" as Id<"reports">)
  })

  // Find in mock data if not in convex
  const mockFallback = useMemo(() => {
    const found = mockReports.find(m => m.id === reportId || m.id.replace('#', '') === reportId.replace('#', ''))
    if (found) {
      return {
        _id: found.id,
        _creationTime: found.timestamp.getTime(),
        locationName: found.location,
        userName: 'Tanod Patrol Team',
        description: `${found.title} - ${found.classification}`,
        status: found.risk === 'High' ? 'critical' : found.risk === 'Medium' ? 'pending' : 'verified',
        accuracy: typeof found.confidence === 'number' ? found.confidence : 85,
        detections: [found.classification, "Mosquito Larvae Habitat"],
        reasoning: "High standing water index and humid conditions promote rapid Aedes aegypti breeding cycles.",
        lat: found.coordinates[0],
        lng: found.coordinates[1],
        verified: found.risk !== 'High',
        imageUri: found.rawPhoto,
        processedImage: found.rawPhoto,
      }
    }
    return null
  }, [reportId])

  const report: any = convexReport || mockFallback

  const verify = useMutation(api.reports.verifyReport)
  const updateReport = useMutation(api.reports.updateReport)

  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>('annotated')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [copiedCoords, setCopiedCoords] = useState(false)

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

  const locHierarchy = useReverseGeocode(report?.lat, report?.lng, report?.locationName)

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return {
          color: 'bg-rose-500 text-white',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          label: 'Critical Risk',
          icon: AlertCircle
        }
      case 'verified':
        return {
          color: 'bg-emerald-600 text-white',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          label: 'Verified Safe / Controlled',
          icon: CheckCircle
        }
      default:
        return {
          color: 'bg-amber-500 text-white',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          label: 'Pending Verification',
          icon: Clock
        }
    }
  }

  const getDisplayImage = (reportObj: any, mode: 'annotated' | 'raw') => {
    if (!reportObj) return ''
    const targetString = mode === 'annotated' && reportObj.processedImage
      ? reportObj.processedImage
      : reportObj.imageUri
    if (!targetString) return ''
    if (targetString.startsWith('http') || targetString.startsWith('data:') || targetString.startsWith('/')) return targetString
    return `data:image/jpeg;base64,${targetString}`
  }

  const handleVerify = async () => {
    if (!report) return
    setIsVerifying(true)
    try {
      if (!reportId.startsWith('#INC')) {
        await verify({ id: report._id as Id<"reports"> })
      }
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSaveEdit = async (formData: any) => {
    if (!report) return
    setIsSaving(true)
    try {
      if (!reportId.startsWith('#INC')) {
        await updateReport({
          id: report._id as Id<"reports">,
          ...formData
        })
      }
      setShowSuccess(true)
      setIsEditModalOpen(false)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyCoordinates = () => {
    if (report?.lat && report?.lng) {
      navigator.clipboard.writeText(`${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}`)
      setCopiedCoords(true)
      setTimeout(() => setCopiedCoords(false), 2000)
    }
  }

  if (convexReport === undefined && !mockFallback) {
    return <DetailSkeleton />
  }

  if (!report) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto p-8 shadow-sm">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Surveillance Record Not Found</h2>
        <p className="text-slate-500 mt-1 text-sm">The report with ID {reportId} could not be located.</p>
        <Link href="/reports" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl mt-5 text-sm font-semibold transition">
          <ArrowLeft size={16} />
          Return to Reports Registry
        </Link>
      </div>
    )
  }

  const status = getStatusBadge(report.status)
  const StatusIcon = status.icon
  const imageUrl = getDisplayImage(report, viewMode)
  const confidenceScore = typeof report.accuracy === 'number'
    ? Math.round(report.accuracy <= 1 ? report.accuracy * 100 : report.accuracy)
    : 85

  const centerCoords: [number, number] = [
    typeof report.lat === 'number' && !isNaN(report.lat) ? report.lat : 10.68498,
    typeof report.lng === 'number' && !isNaN(report.lng) ? report.lng : 122.53764
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-[300] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
          <CheckCircle className="h-5 w-5" />
          <span className="font-bold text-sm">Report updated and synced successfully!</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Link href="/reports" className="hover:text-slate-700 transition-colors">Reports</Link>
            <span>/</span>
            <span className="text-primary-700 font-bold">{locHierarchy.barangay}</span>
            <span>/</span>
            <span>{locHierarchy.district}</span>
          </div>

          {/* Main Title: Barangay, District, City */}
          <div className="flex items-center flex-wrap gap-3">
            <Link
              href="/reports"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-slate-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {locHierarchy.formatted}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${status.color} shadow-sm`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Reported by <strong className="text-slate-700">{report.userName || 'Tanod Patrol'}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {report._creationTime ? new Date(report._creationTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </span>
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Report
          </button>
          <button
            onClick={() => window.print()}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
            title="Print Dossier"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Image Section */}
      {imageUrl && (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Field Surveillance Imagery</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {viewMode === 'annotated' ? 'AI Annotated Analysis' : 'Raw Sensor Feed'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex bg-slate-200/60 p-0.5 rounded-xl">
                <button
                  onClick={() => setViewMode('annotated')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'annotated'
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Zap className="h-3 w-3" />
                  AI Annotated
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'raw'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  Raw Photo
                </button>
              </div>

              {/* Expand Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-slate-200/60 rounded-xl transition text-slate-500"
                title={isExpanded ? "Collapse View" : "Expand View"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <Maximize2 className="h-4 w-4 text-slate-500" />}
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div
            className={`relative bg-slate-950 flex items-center justify-center transition-all duration-300 ${isExpanded ? 'h-[550px]' : 'h-[380px]'
              }`}
          >
            <img
              src={imageUrl}
              alt={locHierarchy.formatted}
              className="w-full h-full object-contain cursor-zoom-in"
              onClick={() => setIsPreviewOpen(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
              }}
            />

            {/* Click to expand pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-white/90 text-xs font-semibold">
              <Maximize2 className="h-3.5 w-3.5 text-primary-400" />
              <span>Click to view full screen</span>
            </div>
          </div>

          {/* Image Meta Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Confidence: <strong className="text-slate-900">{confidenceScore}%</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5 text-primary-600" />
                {report.lat?.toFixed(5)}, {report.lng?.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>{locHierarchy.formatted}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Compact Image Modal */}
      {isPreviewOpen && imageUrl && (
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
                src={imageUrl}
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

      {/* Edit Modal */}
      <EditReportModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        report={report}
        onSave={handleSaveEdit}
        isSaving={isSaving}
      />

      {/* 2-Column Grid Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Structured Location Breakdown Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500" />
                Administrative Location Hierarchy
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                Iloilo City LGU
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barangay</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{locHierarchy.barangay}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Primary Sector</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{locHierarchy.district}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Molo Health Zone</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">City / Province</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{locHierarchy.city}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Western Visayas</p>
              </div>
            </div>

            <div className="p-3.5 bg-primary-50/60 rounded-2xl border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building className="h-4 w-4 text-primary-700" />
                <span className="text-xs font-bold text-primary-950">
                  Standard Address: {locHierarchy.formatted}
                </span>
              </div>
              <button
                onClick={copyCoordinates}
                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-primary-100/50 text-primary-800 rounded-lg text-xs font-bold border border-primary-200 transition"
              >
                <Copy className="h-3 w-3" />
                {copiedCoords ? 'Copied!' : 'Copy GPS'}
              </button>
            </div>
          </div>

          {/* AI Analysis & Vector Intelligence */}
          <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-primary-800/40 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-500/20 rounded-xl text-primary-400 border border-primary-400/30">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-white">AI Vector Diagnostic</h4>
                  <p className="text-[11px] text-primary-300">Automated computer vision & microclimate correlation</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-400 border border-white/15">
                {confidenceScore}% Accuracy Score
              </span>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative z-10">
              <p className="text-base text-slate-100 font-medium italic leading-relaxed">
                &quot;{report.reasoning || 'AI classified stagnant moisture and discarded containers within residential zone.'}&quot;
              </p>
            </div>

            {/* Detections & Checklist */}
            <div className="space-y-2 relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classified Environmental Vectors:</p>
              <div className="flex flex-wrap gap-2">
                {(report.detections || ["Discarded Water Container", "Stagnant Pool", "Mosquito Habitat"]).map((det: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" />
                    {det}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description & Narrative */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-600" />
              Incident Narrative & Field Observation
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed">
              {report.description || 'No additional field observation entered by reporting tanod.'}
            </p>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Interactive Micro-Map */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-primary-600" />
                Live Pin Coordinates
              </h3>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${centerCoords[0]},${centerCoords[1]}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-primary-700 hover:text-primary-900 flex items-center gap-1"
              >
                Open Google Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="w-full h-52 rounded-2xl overflow-hidden border border-slate-200 relative">
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
                <Marker
                  position={centerCoords}
                  icon={getCustomPin(report.status, report.verified)}
                />
                <RecenterMap coords={centerCoords} />
              </MapContainer>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs font-mono text-slate-700">
              <span className="font-semibold">{centerCoords[0].toFixed(6)}, {centerCoords[1].toFixed(6)}</span>
              <button
                onClick={copyCoordinates}
                className="text-slate-400 hover:text-slate-700 font-sans font-bold text-[11px]"
              >
                {copiedCoords ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary-600" />
              Vector Response Actions
            </h3>

            <div className="space-y-2.5">
              {/* Verify Button */}
              <button
                disabled={report.verified || isVerifying}
                onClick={handleVerify}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all shadow-md ${report.verified
                  ? 'bg-emerald-100 text-emerald-800 cursor-default border border-emerald-300'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20 active:scale-95'
                  } disabled:opacity-80`}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying Telemetry...
                  </>
                ) : report.verified ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Report Verified
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify Hotspot
                  </>
                )}
              </button>

              {/* Assign Tanod Team Shortcut */}
              <button
                onClick={() => router.push(`/assignments?reportId=${report._id || reportId}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all active:scale-95"
              >
                <Users className="h-4 w-4" />
                Dispatch Tanod Team
              </button>

              {/* Edit Report */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit Metadata
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}