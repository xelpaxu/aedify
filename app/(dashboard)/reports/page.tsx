'use client'

import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import Link from 'next/link'
import { 
  Search, 
  Plus,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  User,
  SlidersHorizontal,
  FileText,
  X,
  ChevronDown,
  ArrowUpDown,
  Grid3x3,
  LayoutList,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Clock as ClockIcon
} from 'lucide-react'
import { useLanguage } from '../../../src/lib/translations'

// ----- TYPES -----
interface Report {
  _id: string
  _creationTime: number
  locationName?: string
  userName?: string
  description?: string
  status?: string
  imageUri?: string
  processedImage?: string
}

// ----- SKELETON COMPONENTS -----
function ReportCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
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
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl shadow-sm animate-pulse">
      <div className="flex-1 min-w-[200px] h-11 bg-slate-100 rounded-xl" />
      <div className="w-36 h-11 bg-slate-100 rounded-xl" />
      <div className="w-28 h-11 bg-slate-100 rounded-xl" />
    </div>
  )
}

// ----- STAT CARD COMPONENT -----
interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  trend?: number
}

function StatCard({ label, value, icon, color, bgColor, trend }: StatCardProps) {
  return (
    <div className={`p-5 ${bgColor} rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg cursor-default`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${color}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color.replace('text', 'bg').replace('700', '100')} bg-opacity-20`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium">
          <TrendingUp className={`h-3 w-3 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
          <span className={trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-slate-400">vs last week</span>
        </div>
      )}
    </div>
  )
}

// ----- REPORT CARD (Grid) -----
function ReportCard({ report, getStatusBadge, t }: { report: Report; getStatusBadge: (status: string) => any; t: (key: string) => string }) {
  const status = getStatusBadge(report.status || '')
  const StatusIcon = status.icon
  const imageUrl = report.imageUri || report.processedImage || ''
  const displayImage = imageUrl.startsWith('http') 
    ? imageUrl 
    : imageUrl.startsWith('data:') 
      ? imageUrl 
      : imageUrl ? `data:image/jpeg;base64,${imageUrl}` : null

  return (
    <Link
      href={`/reports/${report._id}`}
      className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 border border-slate-100 hover:border-slate-200"
    >
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={report.locationName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.jpg'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <MapPin className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
            {status.label}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1.5 group-hover:text-slate-700 transition-colors">
          {report.locationName || t('unknownLocation')}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {report.description || t('noDescription')}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="text-slate-600">{report.userName || t('unknown')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {report._creationTime ? new Date(report._creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
          </span>
          <span className="flex items-center gap-1 text-slate-900 font-semibold group-hover:text-slate-700 transition-colors">
            <Eye className="h-3.5 w-3.5" />
            {t('view')}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ----- REPORT LIST ITEM -----
function ReportListItem({ report, getStatusBadge, t }: { report: Report; getStatusBadge: (status: string) => any; t: (key: string) => string }) {
  const status = getStatusBadge(report.status || '')
  const StatusIcon = status.icon

  return (
    <Link
      href={`/reports/${report._id}`}
      className="group flex flex-wrap items-center gap-4 p-4 bg-white rounded-2xl hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300 border border-slate-100 hover:border-slate-200"
    >
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <MapPin className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
              {report.locationName || t('unknownLocation')}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-1">
              {report.description || t('noDescription')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {report.userName || t('unknown')}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className="flex items-center gap-1 text-slate-900 font-semibold group-hover:text-slate-700 transition-colors">
          <Eye className="h-3.5 w-3.5" />
          {t('view')}
        </span>
      </div>
    </Link>
  )
}

// ----- MAIN PAGE -----
export default function ReportsPage() {
  const reports = useQuery(api.reports.getAllReports) as Report[] | undefined
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const { t } = useLanguage()

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    switch (normalizedStatus) {
      case 'critical':
        return { 
          color: 'bg-rose-500 text-white', 
          icon: AlertCircle, 
          label: t('critical'), 
          dot: 'bg-rose-400',
          border: 'border-rose-200'
        }
      case 'verified':
        return { 
          color: 'bg-emerald-500 text-white', 
          icon: CheckCircle, 
          label: t('verified'), 
          dot: 'bg-emerald-400',
          border: 'border-emerald-200'
        }
      default:
        return { 
          color: 'bg-amber-500 text-white', 
          icon: Clock, 
          label: t('pending'), 
          dot: 'bg-amber-400',
          border: 'border-amber-200'
        }
    }
  }

  const filteredAndSortedReports = useMemo(() => {
    if (!reports) return []
    
    let filtered = reports.filter((report: Report) => {
      const matchesSearch = report.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            report.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            report.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || report.status?.toLowerCase() === statusFilter
      return matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a: Report, b: Report) => {
      switch (sortBy) {
        case 'newest':
          return b._creationTime - a._creationTime
        case 'oldest':
          return a._creationTime - b._creationTime
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
  }, [reports, searchTerm, statusFilter, sortBy])

  const isLoading = reports === undefined
  const reportCount = filteredAndSortedReports.length
  const totalCount = reports?.length || 0

  // Stats with proper typing
  const stats = useMemo(() => {
    if (!reports) return { total: 0, critical: 0, pending: 0, verified: 0 }
    
    return {
      total: reports.length,
      critical: reports.filter((r: Report) => r.status?.toLowerCase() === 'critical').length || 0,
      pending: reports.filter((r: Report) => r.status?.toLowerCase() !== 'critical' && r.status?.toLowerCase() !== 'verified').length || 0,
      verified: reports.filter((r: Report) => r.status?.toLowerCase() === 'verified').length || 0,
    }
  }, [reports])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSortBy('newest')
  }

  const isFiltered = searchTerm !== '' || statusFilter !== 'all'

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1600px] w-full mx-auto">
      {/* ----- HEADER ----- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {t('reports')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {totalCount} {t('reportsLower')}
            </span>
            {isFiltered && (
              <span className="text-slate-400">· {reportCount} shown</span>
            )}
          </p>
        </div>
        <Link
          href="/reports/new"
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30"
        >
          <Plus className="h-4 w-4" />
          {t('newReport')}
        </Link>
      </div>

      {/* ----- STATS ----- */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-5 bg-white rounded-2xl animate-pulse shadow-sm">
              <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            label={t('total')} 
            value={stats.total} 
            icon={<FileText className="h-5 w-5" />}
            color="text-slate-700"
            bgColor="bg-slate-50"
            trend={5}
          />
          <StatCard 
            label={t('critical')} 
            value={stats.critical} 
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-rose-700"
            bgColor="bg-rose-50"
          />
          <StatCard 
            label={t('pending')} 
            value={stats.pending} 
            icon={<ClockIcon className="h-5 w-5" />}
            color="text-amber-700"
            bgColor="bg-amber-50"
          />
          <StatCard 
            label={t('verified')} 
            value={stats.verified} 
            icon={<ShieldCheck className="h-5 w-5" />}
            color="text-emerald-700"
            bgColor="bg-emerald-50"
          />
        </div>
      )}

      {/* ----- FILTERS BAR ----- */}
      {isLoading ? (
        <FilterBarSkeleton />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Main filter row */}
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchLocation')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer pr-9 min-w-[120px]"
                >
                  <option value="all">{t('allStatus')}</option>
                  <option value="critical">🔴 {t('critical')}</option>
                  <option value="verified">✅ {t('verified')}</option>
                  <option value="pending">⏳ {t('pending')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'status')}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer pr-9 min-w-[120px]"
                >
                  <option value="newest">{t('newest')}</option>
                  <option value="oldest">{t('oldest')}</option>
                  <option value="status">{t('sortByStatus')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  aria-label="List view"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isFiltered && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Active filters chips */}
          {isFiltered && (
            <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-slate-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-slate-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----- REPORTS GRID / LIST ----- */}
      {isLoading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'} gap-4`}>
          {[1,2,3,4,5,6].map(i => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAndSortedReports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
            {searchTerm || statusFilter !== 'all' ? (
              <Search className="h-8 w-8 text-slate-400" />
            ) : (
              <FileText className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchTerm || statusFilter !== 'all' ? t('noMatchingReports') : t('noReports')}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' ? t('tryAdjustingSearch') : t('createFirstReport')}
          </p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              {t('clearFilters')}
            </button>
          ) : (
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition"
            >
              <Plus className="h-4 w-4" />
              {t('newReport')}
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filteredAndSortedReports.map((report: Report) => (
            <ReportCard key={report._id} report={report} getStatusBadge={getStatusBadge} t={t} />
          ))}
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredAndSortedReports.map((report: Report) => (
            <ReportListItem key={report._id} report={report} getStatusBadge={getStatusBadge} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}