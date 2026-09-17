'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  MapPin
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { normalizeReportImage } from '@/src/lib/reportImages'
import { getLocationHierarchy } from '@/src/lib/geoUtils'
import { mockReports } from '@/src/lib/mockData'

// Synthesize pleasant sound chime using Web Audio API (no external asset required)
function playAlertChime(isCritical: boolean = false) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const now = ctx.currentTime

    // Tone 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(isCritical ? 784 : 587.33, now) // G5 or D5
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.05)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2 (higher harmony)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(isCritical ? 1046.5 : 880, now + 0.1) // C6 or A5
    gain2.gain.setValueAtTime(0, now + 0.1)
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.6)
  } catch {
    // Ignore audio permission or autoplay restrictions
  }
}

function getRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Just now'
  const diffMs = Date.now() - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export interface ToastAlert {
  id: string
  reportId?: string
  title: string
  location: string
  message: string
  isCritical: boolean
  thumbnail?: string
  timestamp: number
}

export function NotificationCenter() {
  const router = useRouter()

  // Queries & Mutations
  const convexReports = useQuery(api.reports.getAllReports)
  const convexNotifications = useQuery(api.notifications.getMyNotifications)
  const markAsReadMutation = useMutation(api.notifications.markAsRead)
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead)

  // State
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical'>('all')
  const [toasts, setToasts] = useState<ToastAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set())

  // Track seen report IDs to only alert on truly NEW incoming reports
  const isInitializedRef = useRef(false)
  const knownReportIdsRef = useRef<Set<string>>(new Set())

  // Unified notifications list combining Convex DB notifications with recent report events
  const notificationsList = useMemo(() => {
    const list: Array<{
      id: string
      title: string
      message: string
      reportId?: string
      type: string
      read: boolean
      createdAt: number
      isCritical: boolean
      thumbnail?: string
    }> = []

    // 1. From Convex notifications table
    if (convexNotifications && convexNotifications.length > 0) {
      convexNotifications.forEach((n) => {
        const isCrit = n.type?.includes('critical') || n.title?.toLowerCase().includes('critical')
        list.push({
          id: n._id,
          title: n.title,
          message: n.message,
          reportId: n.reportId,
          type: n.type || 'new_report',
          read: (n.read ?? false) || locallyReadIds.has(n._id),
          createdAt: n.createdAt || Date.now(),
          isCritical: isCrit,
        })
      })
    }

    // 2. From Reports table (ensures real reports generate notifications even if not yet in notifications table)
    if (convexReports && convexReports.length > 0) {
      convexReports.forEach((r) => {
        const alreadyExists = list.some((item) => item.reportId === String(r._id))
        if (!alreadyExists) {
          const loc = getLocationHierarchy(r)
          const isCrit = r.status?.toLowerCase() === 'critical'
          const thumb = normalizeReportImage(r.processedImage || r.imageUri) || '/assets/images/breeding-site.jpeg'

          list.push({
            id: `rep-notif-${r._id}`,
            title: isCrit ? 'Critical Vector Hazard Reported' : 'New Surveillance Report',
            message: `${r.detections?.[0] || 'Breeding site'} detected at ${loc.formatted}.`,
            reportId: String(r._id),
            type: isCrit ? 'critical_report' : 'new_report',
            read: r.status?.toLowerCase() === 'resolved' || locallyReadIds.has(`rep-notif-${r._id}`),
            createdAt: r._creationTime || Date.now(),
            isCritical: isCrit,
            thumbnail: thumb,
          })
        }
      })
    }

    // Sort newest first
    list.sort((a, b) => b.createdAt - a.createdAt)
    return list
  }, [convexNotifications, convexReports])

  // Watcher Effect: Detects new reports arriving in real time and triggers toast + sound
  useEffect(() => {
    if (!convexReports) return

    if (!isInitializedRef.current) {
      // First mount: populate known IDs without spamming alerts
      convexReports.forEach((r) => knownReportIdsRef.current.add(String(r._id)))
      isInitializedRef.current = true
      return
    }

    // Find any new report that arrived since initial mount
    const newReports = convexReports.filter((r) => !knownReportIdsRef.current.has(String(r._id)))

    if (newReports.length > 0) {
      newReports.forEach((report) => {
        knownReportIdsRef.current.add(String(report._id))

        const loc = getLocationHierarchy(report)
        const isCritical = report.status?.toLowerCase() === 'critical'
        const thumbnail = normalizeReportImage(report.processedImage || report.imageUri) || '/assets/images/breeding-site.jpeg'

        const toast: ToastAlert = {
          id: `toast-${report._id}-${Date.now()}`,
          reportId: String(report._id),
          title: isCritical ? 'Critical Vector Hazard Detected' : 'New Surveillance Report',
          location: loc.formatted,
          message: `${report.detections?.[0] || report.description || 'Breeding site'} reported by ${report.userName || 'Tanod Patrol'}.`,
          isCritical,
          thumbnail,
          timestamp: Date.now(),
        }

        // Add toast and play chime
        setToasts((prev) => [toast, ...prev.slice(0, 2)])
        if (soundEnabled) {
          playAlertChime(isCritical)
        }

        // Auto remove toast after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id))
        }, 6000)
      })
    }
  }, [convexReports, soundEnabled])

  // Unread Count
  const unreadCount = useMemo(() => {
    return notificationsList.filter((n) => !n.read).length
  }, [notificationsList])

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter((n) => {
      if (activeTab === 'unread') return !n.read
      if (activeTab === 'critical') return n.isCritical
      return true
    })
  }, [notificationsList, activeTab])

  const handleNotificationClick = async (notif: typeof notificationsList[0]) => {
    setLocallyReadIds((prev) => new Set(prev).add(notif.id))
    if (!notif.read && !notif.id.startsWith('rep-notif-')) {
      try {
        await markAsReadMutation({ notificationId: notif.id as any })
      } catch {
        // ignore
      }
    }
    setIsOpen(false)
    if (notif.reportId) {
      router.push(`/reports/${notif.reportId}`)
    }
  }

  const handleMarkAllRead = async () => {
    setLocallyReadIds(new Set(notificationsList.map((n) => n.id)))
    try {
      await markAllAsReadMutation({})
    } catch {
      // ignore
    }
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      {/* ----- FLOATING LIVE TOAST ALERTS (Top-Right) ----- */}
      <div className="fixed top-5 right-5 z-[600] space-y-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-3xl shadow-2xl border flex gap-3.5 items-start bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 ${
              toast.isCritical
                ? 'border-rose-300 dark:border-rose-900/60 shadow-rose-500/10'
                : 'border-primary-200 dark:border-primary-900/60 shadow-primary-500/10'
            }`}
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200 relative">
              <img
                src={toast.thumbnail || '/assets/images/breeding-site.jpeg'}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
                }}
              />
              {toast.isCritical && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    toast.isCritical
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300'
                  }`}
                >
                  {toast.isCritical ? 'Critical Alert' : 'Live Update'}
                </span>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
                >
                  <X size={14} />
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-1">
                {toast.location}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                {toast.message}
              </p>

              {toast.reportId && (
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                  <button
                    onClick={() => {
                      dismissToast(toast.id)
                      router.push(`/reports/${toast.reportId}`)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    View Report <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ----- HEADER NOTIFICATION BELL BUTTON ----- */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle notifications"
          className={`relative p-2.5 rounded-xl transition-all ${
            isOpen
              ? 'bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-white'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell size={18} strokeWidth={1.8} />

          {/* Unread Counter Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-md border-2 border-white dark:border-slate-900 animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ----- NOTIFICATION POPOVER DROPDOWN ----- */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden animate-scale-in flex flex-col max-h-[520px]">
              
              {/* Header */}
              <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    title={soundEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                  >
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-rose-500" />}
                  </button>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-primary-700 dark:text-primary-400 hover:underline px-1.5"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-white dark:bg-slate-900">
                {(['all', 'unread', 'critical'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-slate-900 text-white dark:bg-primary-600'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab}
                  </button>
                ))}
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Radio size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">No notifications in this view</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 flex gap-3 items-start transition-colors cursor-pointer group ${
                        !notif.read
                          ? 'bg-primary-50/30 dark:bg-primary-950/20 hover:bg-primary-50/60 dark:hover:bg-primary-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Left Icon / Thumbnail */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
                        {notif.thumbnail ? (
                          <img src={notif.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : notif.isCritical ? (
                          <AlertTriangle size={18} className="text-rose-600" />
                        ) : notif.type === 'resolved' ? (
                          <ShieldCheck size={18} className="text-emerald-600" />
                        ) : (
                          <Radio size={18} className="text-primary-600" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-700 transition-colors">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {getRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-center">
                <Link
                  href="/reports"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-primary-700 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                >
                  View Surveillance Registry <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
