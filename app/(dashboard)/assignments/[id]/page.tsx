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
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../../../src/lib/translations'
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
    <div className="max-w-5xl mx-auto space-y-6 pb-8 animate-pulse">
      <div className="relative overflow-hidden rounded-2xl bg-slate-200 h-44" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-4 bg-slate-100 rounded w-full" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-11 bg-slate-200 rounded-xl w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.id as string
  const { t } = useLanguage()

  const assignment = useQuery(api.assignments.getAssignmentById, { assignmentId: assignmentId as Id<"assignments"> })
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return { color: 'bg-emerald-500', label: t('completed'), bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' }
      case 'In Progress':
        return { color: 'bg-blue-500', label: t('inProgress'), bg: 'bg-blue-50 text-blue-700 border border-blue-200/60' }
      default:
        return { color: 'bg-amber-500', label: t('assigned'), bg: 'bg-amber-50 text-amber-700 border border-amber-200/60' }
    }
  }

  const getReportStatusColor = (status: string) => {
    if (status === 'CRITICAL') return 'bg-rose-50 text-rose-700 border border-rose-200/60'
    if (status === 'VERIFIED') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    return 'bg-amber-50 text-amber-700 border border-amber-200/60'
  }

  const handleStatusChange = async (status: string) => {
    setIsUpdating(true)
    try {
      await updateStatus({ assignmentId: assignmentId as Id<"assignments">, status })
    } catch (e) {
      console.error(e)
    } finally {
      setIsUpdating(false)
    }
  }

  if (assignment === undefined) return <DetailSkeleton />

  if (!assignment) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t('assignmentNotFound')}</h2>
        <p className="text-slate-500 mt-1 text-sm">{t('assignmentNotFoundDesc')}</p>
        <Link href="/assignments" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-800 mt-4 text-sm font-semibold transition-colors">
          <ArrowLeft size={14} />
          {t('backToAssignments')}
        </Link>
      </div>
    )
  }

  const status = getStatusBadge(assignment.status)
  const leaderName = assignment.memberNames?.[assignment.memberIds?.indexOf(assignment.leaderId) ?? -1] || 'Not assigned'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8 animate-fade-in-up">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900">
        <div className="relative z-10 p-6 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/assignments"
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{t('assignmentDetail')}</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {assignment.teamName}
                </h1>
                <div className={`w-2.5 h-2.5 rounded-full ${status.color} ring-4 ring-white/20`} />
              </div>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {assignment.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {assignment.status !== 'Completed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('Completed')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all text-sm font-semibold active:scale-[0.98]"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t('markComplete')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 px-6 py-3 bg-white/5 border-t border-white/10 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-white/60">{t('members')}</span>
            <span className="text-xs font-bold text-white">{assignment.memberIds?.length || 0}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-white/60">{t('leader')}</span>
            <span className="text-xs font-semibold text-white/80">{leaderName}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-xs font-semibold text-white/80">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Team Members */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-slate-500" />
              </div>
              {t('teamMembers')}
            </h3>
            <div className="space-y-2 pl-9">
              {(assignment.memberNames || []).map((name, i) => {
                const memberId = assignment.memberIds?.[i]
                const isLeader = memberId === assignment.leaderId
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isLeader ? 'bg-amber-50 border border-amber-200/60' : 'bg-slate-50'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${isLeader ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{name}</p>
                      {isLeader && (
                        <span className="text-[9px] font-bold uppercase text-amber-600">{t('teamLeader')}</span>
                      )}
                    </div>
                    {isLeader && <Shield size={14} className="text-amber-500" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Report Details */}
          {assignment.reportDescription && (
            <div className="bg-white rounded-2xl p-5">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                </div>
                {t('reportDetails')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed pl-9">{assignment.reportDescription}</p>
            </div>
          )}

          {/* AI Analysis */}
          {assignment.reportReasoning && (
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-white/80">{t('aiAnalysis')}</h4>
              </div>
              <p className="text-sm font-medium leading-relaxed italic pl-10">
                &quot;{assignment.reportReasoning}&quot;
              </p>
              <div className="mt-4 pl-10 flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t('confidence')}: <span className="font-semibold text-white/90">{assignment.reportAccuracy || 0}%</span>
                </span>
                <span className="w-px h-3 bg-white/20" />
                <span>{t('status')}: <span className="font-semibold text-white/90">{assignment.reportStatus}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status Control */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">{t('status')}</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {['Assigned', 'In Progress', 'Completed'].map((s) => {
                const isActive = assignment.status === s
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={isUpdating}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                      isActive
                        ? s === 'Completed' ? 'bg-emerald-500 text-white' : s === 'In Progress' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'Assigned' ? t('assigned') : s === 'In Progress' ? t('inProgress') : t('completed')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location Map */}
          {assignment.locationLat !== 0 && (
            <div className="bg-white rounded-2xl p-5">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                </div>
                {t('location')}
              </h3>
              <div className="w-full h-44 rounded-xl overflow-hidden">
                <MapContainer
                  center={[assignment.locationLat, assignment.locationLng]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[assignment.locationLat, assignment.locationLng]} icon={DefaultIcon} />
                  <RecenterMap coords={[assignment.locationLat, assignment.locationLng]} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-slate-500" />
              </div>
              {t('assignmentInfo')}
            </h3>
            <div className="space-y-3 pl-9">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('assignmentId')}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{assignment._id}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('assignedAt')}</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('region')}</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{assignment.region}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('reportStatus')}</p>
                <span className={`inline-block text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase mt-1 ${getReportStatusColor(assignment.reportStatus)}`}>
                  {assignment.reportStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">{t('quickActions')}</h3>
            <div className="space-y-2.5">
              <Link
                href={`/reports/${assignment.reportId}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-[0.98]"
              >
                <FileText size={14} />
                {t('viewReport')}
              </Link>
              {assignment.status !== 'Completed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('Completed')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {t('markComplete')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
