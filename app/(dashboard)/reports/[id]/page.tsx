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
  List
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import L from 'leaflet'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function RecenterMap({ coords }: { coords: [number, number] }) {
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => { map.setView(coords, 15) }, [coords, map])
  return null
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8 animate-pulse">
      <div className="relative overflow-hidden rounded-2xl bg-slate-200 h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-32" />
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

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string
  
  const report = useQuery(api.reports.getReport, { id: reportId as Id<"reports"> })
  const verify = useMutation(api.reports.verifyReport)
  
  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>('annotated')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return { 
          color: 'bg-rose-500', 
          bg: 'bg-rose-50', 
          text: 'text-rose-700', 
          border: 'border-rose-200',
          label: 'Critical',
          icon: AlertCircle
        }
      case 'verified':
        return { 
          color: 'bg-emerald-500', 
          bg: 'bg-emerald-50', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200',
          label: 'Verified',
          icon: CheckCircle
        }
      default:
        return { 
          color: 'bg-amber-500', 
          bg: 'bg-amber-50', 
          text: 'text-amber-700', 
          border: 'border-amber-200',
          label: 'Pending',
          icon: Clock
        }
    }
  }

  const getDisplayImage = (report: any, mode: 'annotated' | 'raw') => {
    if (!report) return ''
    const targetString = mode === 'annotated' && report.processedImage 
      ? report.processedImage 
      : report.imageUri
    if (!targetString) return ''
    if (targetString.startsWith('http')) return targetString
    if (targetString.startsWith('data:')) return targetString
    return `data:image/jpeg;base64,${targetString}`
  }

  if (report === undefined) {
    return <DetailSkeleton />
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Report not found</h2>
        <p className="text-slate-500 mt-1 text-sm">The report you're looking for doesn't exist.</p>
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 mt-4 text-sm font-semibold transition-colors">
          <ArrowLeft size={14} />
          Back to reports
        </Link>
      </div>
    )
  }

  const status = getStatusBadge(report.status)
  const StatusIcon = status.icon
  const imageUrl = getDisplayImage(report, viewMode)

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      await verify({ id: report._id as Id<"reports"> })
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {report.locationName || 'Unknown Location'}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text} border ${status.border}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Reported by {report.userName || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
            <Printer className="h-4 w-4" />
          </button>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image Section with Expand/Collapse */}
      {imageUrl && (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Report Image</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {viewMode === 'annotated' ? 'AI Analysis' : 'Raw'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode('annotated')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                    viewMode === 'annotated'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  AI
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                    viewMode === 'raw'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  Raw
                </button>
              </div>
              {/* Expand toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div
            className={`relative bg-slate-50 flex items-center justify-center transition-all duration-300 ${
              isExpanded ? 'h-[600px]' : 'h-[400px]'
            }`}
          >
            <img
              src={imageUrl}
              alt={report.locationName || 'Report image'}
              className="w-full h-full object-contain cursor-zoom-in"
              onClick={() => setIsPreviewOpen(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.jpg'
              }}
            />
            
            {/* Image overlay controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <Maximize2 className="h-3.5 w-3.5 text-white/60" />
              <span className="text-white/80 text-xs font-medium">
                Click image to expand
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span className="text-white/50 text-[10px]">
                {viewMode === 'annotated' ? 'AI Overlay' : 'Original'}
              </span>
            </div>
          </div>

          {/* Image metadata bar */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Confidence: <span className="font-semibold text-slate-700">{report.accuracy || 0}%</span>
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <Crosshair className="h-3 w-3" />
              {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isPreviewOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>
          <div
            className="relative max-w-6xl w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={report.locationName || 'Report image'}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
              <span className="text-white/90 text-sm font-medium">
                {report.locationName || 'Report'}
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span className="text-white/60 text-xs">
                {viewMode === 'annotated' ? 'AI Analysis' : 'Raw Image'}
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span className="text-white/60 text-xs">
                {report.accuracy || 0}% confidence
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Details Grid - 2/3 + 1/3 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-500" />
              Description
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {report.description || 'No description provided'}
            </p>
          </div>

          {/* AI Reasoning */}
          <div className="bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5" />
              <h4 className="font-bold text-sm uppercase tracking-wider opacity-80">AI Analysis</h4>
            </div>
            <p className="text-lg font-medium leading-relaxed italic">
              &quot;{report.reasoning || 'Analysis pending'}&quot;
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Confidence: {report.accuracy || 0}%
              </span>
              <span className="w-px h-4 bg-white/20" />
              <span>Status: {report.status || 'Pending'}</span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary-500" />
              Report Metadata
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported By</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{report.userName || 'Unknown'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{report.status || 'Pending'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{report.verified ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Location Map */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary-500" />
              Location
            </h3>
            <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200">
              <MapContainer 
                center={[report.lat || 0, report.lng || 0]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={[report.lat || 0, report.lng || 0]} icon={DefaultIcon} />
                <RecenterMap coords={[report.lat || 0, report.lng || 0]} />
              </MapContainer>
            </div>
            <div className="mt-2 text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              📍 {report.lat?.toFixed(6) || '0.000000'}, {report.lng?.toFixed(6) || '0.000000'}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">Actions</h3>
            <div className="space-y-2.5">
              <button
                disabled={report.verified || isVerifying}
                onClick={handleVerify}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  report.verified
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200/50 hover:shadow-primary-200/70'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : report.verified ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Verify Report
                  </>
                )}
              </button>
              
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200/50">
                <X className="h-4 w-4" />
                Dismiss Report
              </button>

              <Link
                href={`/reports/${report._id}/edit`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                ✏️ Edit Report
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}