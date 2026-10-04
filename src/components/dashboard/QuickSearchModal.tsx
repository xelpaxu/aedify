'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  BarChart3,
  FileText,
  Map,
  ClipboardList,
  Settings,
  UserRound,
  LogOut,
  CornerDownLeft,
  X,
  FileDown,
  Languages,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronRight,
  Hash
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../lib/translations'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { mockReports } from '../../lib/mockData'

interface SearchItem {
  id: string
  title: string
  subtitle: string
  category: 'Tabs & Navigation' | 'Quick Actions' | 'Reports & Hotspots'
  icon: React.ElementType
  iconColor: string
  badge?: string
  badgeColor?: string
  action: () => void
  keywords: string[]
}

interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchReport {
  _id?: string
  id?: string
  barangay?: string
  locationName?: string
  location?: string
  status?: string
  riskLevel?: string
  typology?: string
  breedingSiteType?: string
  reporterName?: string
}

export function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch reports for live search
  const convexReports = useQuery(api.reports.getAllReports)

  // Determine user role and barangay scope
  const userRole = user?.role || 'brgy-southfundidor'
  const userBarangay = useMemo(() => {
    if (userRole === 'brgy-calumpang') return 'calumpang'
    if (userRole === 'brgy-southfundidor') return 'southfundidor'
    return 'all'
  }, [userRole])

  // Filter accessible reports based on role
  const reportsList = useMemo(() => {
    const rawList = (convexReports && convexReports.length > 0) ? convexReports : mockReports
    return rawList.filter((r: SearchReport) => {
      if (userBarangay === 'all') return true
      const b = (r.barangay || '').toLowerCase()
      const loc = (r.locationName || r.location || '').toLowerCase()
      if (userBarangay === 'calumpang') return b.includes('calumpang') || loc.includes('calumpang')
      if (userBarangay === 'southfundidor') return b.includes('south fundidor') || b.includes('fundidor') || loc.includes('south fundidor') || loc.includes('fundidor')
      return true
    })
  }, [convexReports, userBarangay])

  // Build searchable items
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [
      // --- TABS & NAVIGATION ---
      {
        id: 'tab-dashboard',
        title: 'Dashboard',
        subtitle: 'Surveillance overview, real-time KPI metrics & active incidents',
        category: 'Tabs & Navigation',
        icon: LayoutDashboard,
        iconColor: 'text-teal-600 bg-teal-50',
        badge: 'Tab',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        action: () => router.push('/dashboard'),
        keywords: ['dashboard', 'home', 'overview', 'summary', 'kpi', 'incidents', 'tanod', 'monitoring']
      },
      {
        id: 'tab-analytics',
        title: 'Analytics & Insights',
        subtitle: 'Public health epidemiology, hotspot matrix, risk trends & PDF reports',
        category: 'Tabs & Navigation',
        icon: BarChart3,
        iconColor: 'text-indigo-600 bg-indigo-50',
        badge: 'Tab',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        action: () => router.push('/analytics'),
        keywords: ['analytics', 'charts', 'trends', 'hotspot load', 'typology', 'epidemiology', 'statistics', 'graphs']
      },
      {
        id: 'tab-map',
        title: 'Hotspot Risk Map',
        subtitle: 'Interactive geospatial hazard visualizer, cluster registry & GPS coordinates',
        category: 'Tabs & Navigation',
        icon: Map,
        iconColor: 'text-emerald-600 bg-emerald-50',
        badge: 'Tab',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        action: () => router.push('/map'),
        keywords: ['map', 'risk map', 'hotspot', 'geospatial', 'leaflet', 'gps', 'clusters', 'breeding sites']
      },
      {
        id: 'tab-reports',
        title: 'Vector Reports',
        subtitle: 'Full surveillance dossiers, AI verification logs & breeding container database',
        category: 'Tabs & Navigation',
        icon: FileText,
        iconColor: 'text-amber-600 bg-amber-50',
        badge: 'Tab',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        action: () => router.push('/reports'),
        keywords: ['reports', 'dossiers', 'vector', 'breeding sites', 'images', 'verification', 'dengue', 'larvae']
      },
      {
        id: 'tab-assignments',
        title: 'Field Assignments',
        subtitle: 'Tanod dispatch teams, task board, sector patrols & resolution workflow',
        category: 'Tabs & Navigation',
        icon: ClipboardList,
        iconColor: 'text-rose-600 bg-rose-50',
        badge: 'Tab',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        action: () => router.push('/assignments'),
        keywords: ['assignments', 'tasks', 'dispatch', 'tanod', 'field response', 'patrol', 'clearing', 'larvicide']
      },
      {
        id: 'tab-profile',
        title: 'User Profile',
        subtitle: 'Official credentials, jurisdiction assignment & contact information',
        category: 'Tabs & Navigation',
        icon: UserRound,
        iconColor: 'text-slate-600 bg-slate-100',
        badge: 'Tab',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        action: () => router.push('/profile'),
        keywords: ['profile', 'account', 'user', 'email', 'jurisdiction', 'credentials']
      },
      {
        id: 'tab-settings',
        title: 'Settings & Preferences',
        subtitle: 'System language, notifications, dark mode & portal configurations',
        category: 'Tabs & Navigation',
        icon: Settings,
        iconColor: 'text-slate-600 bg-slate-100',
        badge: 'Tab',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        action: () => router.push('/settings'),
        keywords: ['settings', 'preferences', 'configuration', 'language', 'theme', 'security']
      },

      // --- QUICK ACTIONS ---
      {
        id: 'action-pdf',
        title: 'Export Health Bulletin (PDF)',
        subtitle: 'Generate and download official vector surveillance bulletin with executive signatures',
        category: 'Quick Actions',
        icon: FileDown,
        iconColor: 'text-teal-600 bg-teal-50',
        badge: 'Action',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        action: () => router.push('/analytics'),
        keywords: ['export', 'pdf', 'bulletin', 'download', 'print', 'report document', 'executive']
      },
      {
        id: 'action-lang',
        title: language === 'en' ? 'Switch to Filipino (Tagalog)' : 'Lumipat sa Ingles (English)',
        subtitle: `Current interface language: ${language === 'en' ? 'English' : 'Tagalog / Filipino'}`,
        category: 'Quick Actions',
        icon: Languages,
        iconColor: 'text-blue-600 bg-blue-50',
        badge: 'Language',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        action: () => {
          setLanguage(language === 'en' ? 'tl' : 'en')
        },
        keywords: ['language', 'translate', 'filipino', 'tagalog', 'english', 'wika', 'salin']
      },
      {
        id: 'action-logout',
        title: 'Sign Out / Logout',
        subtitle: `Signed in as ${user?.email || 'Admin'} (${userRole})`,
        category: 'Quick Actions',
        icon: LogOut,
        iconColor: 'text-rose-600 bg-rose-50',
        badge: 'Auth',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        action: () => {
          logout()
        },
        keywords: ['logout', 'signout', 'exit', 'leave', 'disconnect']
      }
    ]

    // --- POPULATE LIVE REPORTS & HOTSPOTS ---
    reportsList.slice(0, 8).forEach((r: SearchReport, idx: number) => {
      const repId = r._id || r.id || `REP-${String(idx + 1).padStart(3, '0')}`
      const loc = r.locationName || r.location || 'Molo District'
      const brgy = r.barangay || (loc.includes('Calumpang') ? 'Brgy. Calumpang' : 'Brgy. South Fundidor')
      const risk = (r.status === 'CRITICAL' || r.riskLevel === 'HIGH') ? 'CRITICAL' : r.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING'
      const typology = r.typology || r.breedingSiteType || 'Breeding Site'

      items.push({
        id: `report-${repId}`,
        title: `${repId.toString().slice(-8).toUpperCase()}: ${typology}`,
        subtitle: `${loc} • ${brgy} • Risk: ${risk}`,
        category: 'Reports & Hotspots',
        icon: risk === 'CRITICAL' ? ShieldAlert : risk === 'RESOLVED' ? CheckCircle2 : Clock,
        iconColor: risk === 'CRITICAL' ? 'text-rose-600 bg-rose-50' : risk === 'RESOLVED' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50',
        badge: risk,
        badgeColor: risk === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-200' : risk === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200',
        action: () => router.push(`/reports/${repId}`),
        keywords: ['report', 'hotspot', repId.toString(), loc, brgy, risk, typology, r.reporterName || '']
      })
    })

    return items
  }, [router, user, userRole, language, setLanguage, logout, reportsList])

  // Filter items based on user query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems

    return allItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(q)
      const subMatch = item.subtitle.toLowerCase().includes(q)
      const catMatch = item.category.toLowerCase().includes(q)
      const keywordMatch = item.keywords.some(k => k.toLowerCase().includes(q))
      return titleMatch || subMatch || catMatch || keywordMatch
    })
  }, [allItems, query])

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: SearchItem[] }[] = []
    const categories: ('Tabs & Navigation' | 'Quick Actions' | 'Reports & Hotspots')[] = [
      'Tabs & Navigation',
      'Quick Actions',
      'Reports & Hotspots'
    ]

    categories.forEach(cat => {
      const matches = filteredItems.filter(item => item.category === cat)
      if (matches.length > 0) {
        groups.push({ category: cat, items: matches })
      }
    })

    return groups
  }, [filteredItems])

  const activeIndex = Math.min(selectedIndex, Math.max(0, filteredItems.length - 1))

  // Native modal containment keeps keyboard focus inside the palette.
  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    dialog?.showModal()
    inputRef.current?.focus()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [isOpen])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, query])

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.target !== inputRef.current) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[activeIndex]) {
        filteredItems[activeIndex].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [filteredItems, activeIndex, onClose])

  if (!isOpen) return null

  // Calculate current flat index for category rendering
  let currentFlatIndex = 0

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search pages and actions"
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-2xl max-h-[85dvh] bg-transparent p-0 backdrop:bg-slate-950/60 backdrop:backdrop-blur-md"
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[min(85dvh,640px)] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <Search size={20} className="text-teal-600 shrink-0 ml-1 mr-3" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search pages and actions"
            aria-expanded="true"
            aria-controls="quick-search-results"
            aria-autocomplete="list"
            aria-activedescendant={filteredItems[activeIndex] ? `search-${filteredItems[activeIndex].id}` : undefined}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Type a tab (e.g. 'dashboard', 'analytics', 'map', 'reports')..."
            className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-[15px] font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedIndex(0); inputRef.current?.focus() }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition mr-2 cursor-pointer"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
          >
            <kbd className="font-sans">ESC</kbd>
          </button>
        </div>

        {/* Results List */}
        <div 
          ref={listRef} 
          id="quick-search-results"
          role="listbox"
          aria-label="Search results"
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4 custom-scrollbar"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Search size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No matching results</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No tabs, actions, or reports matched &ldquo;<span className="text-slate-700 font-semibold">{query}</span>&rdquo;. Try searching for &ldquo;dashboard&rdquo;, &ldquo;map&rdquo;, &ldquo;analytics&rdquo;, or &ldquo;reports&rdquo;.
              </p>
            </div>
          ) : (
            groupedItems.map(group => (
              <div key={group.category} className="space-y-1">
                {/* Category Header */}
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={12} className="text-slate-300" />
                  <span>{group.category}</span>
                </div>

                {/* Items in Category */}
                <div className="space-y-1">
                  {group.items.map(item => {
                    const itemFlatIndex = currentFlatIndex++
                    const isSelected = itemFlatIndex === activeIndex
                    const IconComponent = item.icon

                    return (
                      <div
                        key={item.id}
                        id={`search-${item.id}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          item.action()
                          onClose()
                        }}
                        onMouseEnter={() => setSelectedIndex(itemFlatIndex)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100 ${
                          isSelected
                            ? 'bg-teal-50/80 text-teal-950 border border-teal-200 shadow-xs ring-1 ring-teal-400/20'
                            : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                          <IconComponent size={18} strokeWidth={2} />
                        </div>

                        {/* Text details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-teal-900 truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 group-hover:text-slate-600 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>

                        {/* Trailing Jump Indicator */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-1 rounded-lg">
                              <span>Jump</span>
                              <CornerDownLeft size={12} />
                            </span>
                          ) : (
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Shortcut Guide */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono shadow-2xs">↓</kbd>
              <span className="text-slate-400">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono shadow-2xs">↵</kbd>
              <span className="text-slate-400">to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono shadow-2xs">ESC</kbd>
              <span className="text-slate-400">to exit</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <span>Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-teal-700 font-mono font-bold shadow-2xs">Ctrl P</kbd>
          </div>
        </div>
      </div>
    </dialog>
  )
}
