'use client'

import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Grid3x3, LayoutList, X, Eye, ArrowRight } from 'lucide-react'
import { getReportPreview } from '@/src/lib/reportImages'
import { useLanguage } from '../../../src/lib/translations'
import { getLocationHierarchy, useReverseGeocode } from '../../../src/lib/geoUtils'
import { mockReports } from '../../../src/lib/mockData'

// ----- TYPES -----
interface Report {
  _id: string
  _creationTime: number
  locationName?: string
  location?: string
  userName?: string
  description?: string
  status?: string
  accuracy?: number
  confidence?: number
  detections?: string[]
  reasoning?: string
  lat?: number
  lng?: number
  verified?: boolean
  imageUri?: string
  processedImage?: string
  reviewType?: 'admin-modified'
}

interface StatusBadge {
  color: string
  label: string
  dot: string
  border: string
}

// ----- SKELETON COMPONENTS -----
function ReportCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm border border-slate-100">
      <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-100" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded-lg w-3/4" />
        <div className="space-y-2">
          <div className="h-3.5 bg-slate-100 rounded-lg w-full" />
          <div className="h-3.5 bg-slate-100 rounded-lg w-2/3" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="h-3 bg-slate-100 rounded-lg w-20" />
          <div className="h-3 bg-slate-100 rounded-lg w-16" />
          <div className="h-3 bg-slate-100 rounded-lg w-12" />
        </div>
      </div>
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex-1 min-w-[200px] h-11 bg-slate-100 rounded-xl" />
      <div className="w-36 h-11 bg-slate-100 rounded-xl" />
      <div className="w-28 h-11 bg-slate-100 rounded-xl" />
    </div>
  )
}

// ----- REPORT CARD (Grid View) -----
function ReportCard({ report, getStatusBadge, t }: { report: Report; getStatusBadge: (status: string) => StatusBadge; t: (key: string) => string }) {
  const status = getStatusBadge(report.status || '')
  const locHierarchy = useReverseGeocode(report.lat, report.lng, report.locationName || report.location)
  const displayImage = getReportPreview(report)

  const confidenceScore = typeof report.accuracy === 'number'
    ? Math.round(report.accuracy <= 1 ? report.accuracy * 100 : report.accuracy)
    : typeof report.confidence === 'number'
      ? Math.round(report.confidence)
      : 85

  return (
    <Link
      href={`/reports/${report._id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl hover:shadow-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700 dark:hover:shadow-black/30"
    >
      <div>
        {/* Top Image Banner */}
        <div className="relative aspect-[16/9] min-h-44 bg-slate-900 overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={locHierarchy.formatted}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400">

              <span className="text-[11px] font-medium tracking-wide">Vector Telemetry Map</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Status & Confidence Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/15">

              {confidenceScore}% AI Confidence
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          {/* Main Title */}
          <div>
            <h3 className="line-clamp-1 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
              {locHierarchy.formatted}
            </h3>
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {report.description || t('noDescription')}
          </p>

          {/* Detections tags if present */}
          {report.detections && report.detections.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {report.detections.slice(0, 2).map((det, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  {det}
                </span>
              ))}
              {report.detections.length > 2 && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                  +{report.detections.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
        <span className="flex items-center gap-1.5">

          <span className="text-slate-700 font-semibold truncate">{report.userName || t('unknown')}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">

          {report._creationTime ? new Date(report._creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
        </span>
        <span className="flex items-center gap-1 text-primary-700 font-bold group-hover:translate-x-0.5 transition-transform">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

// ----- REPORT LIST ITEM (List View) -----
function ReportListItem({ report, getStatusBadge, t }: { report: Report; getStatusBadge: (status: string) => StatusBadge; t: (key: string) => string }) {
  const status = getStatusBadge(report.status || '')
  const locHierarchy = useReverseGeocode(report.lat, report.lng, report.locationName || report.location)
  const displayImage = getReportPreview(report)

  const confidenceScore = typeof report.accuracy === 'number'
    ? Math.round(report.accuracy <= 1 ? report.accuracy * 100 : report.accuracy)
    : typeof report.confidence === 'number'
      ? Math.round(report.confidence)
      : 85

  return (
    <Link
      href={`/reports/${report._id}`}
      className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary-300 hover:shadow-md hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700 dark:hover:shadow-black/30 sm:p-5"
    >
      <div className="contents">
        {/* Thumbnail */}
        <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-slate-900 shrink-0 overflow-hidden relative border border-slate-200 dark:border-slate-700">
          {displayImage ? (
            <img
              src={displayImage}
              alt=""
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/images/breeding-site.jpeg'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-center text-xs dark:bg-slate-800 dark:text-slate-500">
              No photo
            </div>
          )}
        </div>

        {/* Title & Location details */}
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-primary-700 transition-colors line-clamp-2 dark:text-slate-100 dark:group-hover:text-primary-300">
            {locHierarchy.formatted}
          </h3>
          <p className="text-sm leading-relaxed text-slate-500 line-clamp-2 mt-2 dark:text-slate-400">
            {report.description || t('noDescription')}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-3 dark:text-slate-400">
            <span className="min-w-0 max-w-full truncate">
              {report.userName || t('unknown')}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">

              {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Right meta and status */}
      <div className="col-span-2 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">

          {confidenceScore}% AI Confidence
        </span>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        <span className="ml-auto inline-flex items-center justify-center rounded-lg p-2 text-primary-700 transition-colors group-hover:bg-primary-50 dark:text-primary-300 dark:group-hover:bg-primary-950" aria-label={t('view')}>
          <Eye className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

// ----- MAIN PAGE -----
export default function ReportsPage() {
  const convexReports = useQuery(api.reports.getAllReports) as Report[] | undefined
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [barangayFilter, setBarangayFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { t } = useLanguage()

  // Prepare unified report list with fallback to mockReports if convex query returns empty
  const reports: Report[] | undefined = useMemo(() => {
    if (convexReports === undefined) return undefined
    if (convexReports && convexReports.length > 0) return convexReports
    const fallbackTimestamp = new Date('2026-01-01T00:00:00Z').getTime()
    return mockReports.map(m => ({
      _id: m.id,
      _creationTime: m.timestamp instanceof Date ? m.timestamp.getTime() : fallbackTimestamp,
      locationName: m.location,
      userName: 'Tanod Patrol',
      description: `${m.title} - ${m.classification}`,
      status: m.risk === 'High' ? 'critical' : m.risk === 'Medium' ? 'pending' : 'verified',
      accuracy: typeof m.confidence === 'number' ? m.confidence / 100 : 0.85,
      detections: [m.classification],
      reasoning: 'AI vector classification identified breeding hazards within local perimeter.',
      lat: m.coordinates[0],
      lng: m.coordinates[1],
      verified: m.risk !== 'High',
      imageUri: m.rawPhoto,
    }))
  }, [convexReports])

  const getStatusBadge = (status: string): StatusBadge => {
    const normalizedStatus = status?.toLowerCase() || ''
    switch (normalizedStatus) {
      case 'resolved':
      case 'completed':
        return {
          color: 'bg-slate-800 text-white',
          label: 'Resolved',
          dot: 'bg-emerald-400',
          border: 'border-slate-300'
        }
      case 'critical':
        return {
          color: 'bg-rose-500 text-white',
          label: t('critical'),
          dot: 'bg-rose-300',
          border: 'border-rose-200'
        }
      case 'verified':
        return {
          color: 'bg-emerald-600 text-white',
          label: t('verified'),
          dot: 'bg-emerald-300',
          border: 'border-emerald-200'
        }
      default:
        return {
          color: 'bg-amber-500 text-white',
          label: t('pending'),
          dot: 'bg-amber-300',
          border: 'border-amber-200'
        }
    }
  }

  const filteredAndSortedReports = useMemo(() => {
    if (!reports) return []

    const filtered = reports.filter((report: Report) => {
      const loc = getLocationHierarchy(report)
      const matchesSearch = loc.formatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || report.status?.toLowerCase() === statusFilter

      const matchesBarangay = barangayFilter === 'all' ||
        loc.barangay.toLowerCase().includes(barangayFilter.toLowerCase()) ||
        loc.formatted.toLowerCase().includes(barangayFilter.toLowerCase())

      return matchesSearch && matchesStatus && matchesBarangay
    })

    // Sort
    filtered.sort((a: Report, b: Report) => {
      switch (sortBy) {
        case 'newest':
          return (b._creationTime || 0) - (a._creationTime || 0)
        case 'oldest':
          return (a._creationTime || 0) - (b._creationTime || 0)
        case 'status': {
          const statusOrder: { [key: string]: number } = { critical: 0, pending: 1, verified: 2 }
          const statusA = a.status?.toLowerCase() || 'pending'
          const statusB = b.status?.toLowerCase() || 'pending'
          return (statusOrder[statusA] ?? 1) - (statusOrder[statusB] ?? 1)
        }
        default:
          return 0
      }
    })

    return filtered
  }, [reports, searchTerm, statusFilter, barangayFilter, sortBy])

  const isLoading = reports === undefined
  const reportCount = filteredAndSortedReports.length
  const totalCount = reports?.length || 0

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setBarangayFilter('all')
    setSortBy('newest')
  }

  const isFiltered = searchTerm !== '' || statusFilter !== 'all' || barangayFilter !== 'all'

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-10 animate-fade-in-up">
      {/* ----- HEADER ----- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {t('reports')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium">
              {totalCount} {t('reportsLower')}
            </span>
            {isFiltered && (
              <span className="text-slate-400 font-medium">· {reportCount} matching filters</span>
            )}
          </p>
        </div>
      </div>

      {/* ----- FILTERS BAR ----- */}
      {isLoading ? (
        <FilterBarSkeleton />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Main filter row */}
          <div className="flex flex-wrap items-center gap-3 p-4">
            {/* Search Input */}
            <div className="flex-1 min-w-[220px] relative">

              <input
                aria-label="Search reports"
                type="text"
                placeholder="Search barangay, reporter, or incident description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3.5 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Barangay Filter */}
            <div className="relative">
              <select
                aria-label="Filter by barangay"
                value={barangayFilter}
                onChange={(e) => setBarangayFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer pr-3.5 min-w-[140px]"
              >
                <option value="all">All Barangays</option>
                <option value="Calumpang">Brgy. Calumpang</option>
                <option value="San Juan">Brgy. San Juan</option>
                <option value="South Fundidor">Brgy. South Fundidor</option>
                <option value="North San Jose">Brgy. North San Jose</option>
                <option value="Compania">Brgy. Compania</option>
                <option value="Timawa">Brgy. Timawa</option>
              </select>

            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer pr-3.5 min-w-[125px]"
              >
                <option value="all">{t('allStatus')}</option>
                <option value="critical">{t('critical')}</option>
                <option value="verified">{t('verified')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="resolved">Resolved</option>
              </select>

            </div>
            {/* Sort Filter */}
            <div className="relative">
              <select
                aria-label="Sort reports"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'status')}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer pr-3.5 min-w-[125px]"
              >
                <option value="newest">{t('newest')}</option>
                <option value="oldest">{t('oldest')}</option>
                <option value="status">{t('sortByStatus')}</option>
              </select>

            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid3x3 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <LayoutList className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Reset filters"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {isFiltered && (
            <div className="px-4 pb-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
              <span className="text-xs font-bold text-slate-400">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                  Search: &quot;{searchTerm}&quot;
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:text-slate-900 transition-colors"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              )}
              {barangayFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  Barangay: {barangayFilter}
                  <button
                    onClick={() => setBarangayFilter('all')}
                    className="hover:text-slate-900 transition-colors"
                    aria-label="Remove barangay filter"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                  Status: {t(statusFilter)}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="hover:text-slate-900 transition-colors"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* ----- REPORTS GRID / LIST ----- */}
      {isLoading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAndSortedReports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">

          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchTerm || statusFilter !== 'all' || barangayFilter !== 'all' ? t('noMatchingReports') : t('noReports')}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || barangayFilter !== 'all' ? t('tryAdjustingSearch') : t('createFirstReport')}
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
          {filteredAndSortedReports.map((report: Report) => (
            <ReportCard key={report._id} report={report} getStatusBadge={getStatusBadge} t={t} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {filteredAndSortedReports.map((report: Report) => (
            <ReportListItem key={report._id} report={report} getStatusBadge={getStatusBadge} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}