'use client'

import { useState } from 'react'
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
  FileText
} from 'lucide-react'
import { useLanguage } from '../../../src/lib/translations'

function ReportCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded-lg w-full" />
          <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
        </div>
        <div className="flex items-center justify-between pt-2">
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
    <div className="flex flex-wrap items-center gap-3 p-3.5 bg-white rounded-2xl animate-pulse">
      <div className="flex-1 min-w-[200px] h-10 bg-slate-100 rounded-xl" />
      <div className="w-32 h-10 bg-slate-100 rounded-xl" />
    </div>
  )
}

export default function ReportsPage() {
  const reports = useQuery(api.reports.getAllReports)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { t } = useLanguage()

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return { color: 'bg-rose-500 text-white', icon: AlertCircle, label: t('critical'), dot: 'bg-white' }
      case 'verified':
        return { color: 'bg-emerald-500 text-white', icon: CheckCircle, label: t('verified'), dot: 'bg-white' }
      default:
        return { color: 'bg-amber-500 text-white', icon: Clock, label: t('pending'), dot: 'bg-white' }
    }
  }

  const filteredReports = reports?.filter((report: any) => {
    const matchesSearch = report.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.userName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || report.status?.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const isLoading = reports === undefined
  const reportCount = filteredReports?.length || 0
  const totalCount = reports?.length || 0

  return (
    <div className="space-y-5 animate-fade-in-up max-w-[1600px] w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('reports')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('manageReports')}</p>
        </div>
        <Link
          href="/reports/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t('newReport')}
        </Link>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-4 bg-white rounded-2xl animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-7 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
          <div className="p-4 bg-slate-900 text-white rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{t('total')}</p>
            <p className="text-2xl font-bold mt-1">{totalCount}</p>
          </div>
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{t('critical')}</p>
            <p className="text-2xl font-bold mt-1">{reports?.filter((r: any) => r.status?.toLowerCase() === 'critical').length || 0}</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{t('pending')}</p>
            <p className="text-2xl font-bold mt-1">{reports?.filter((r: any) => r.status?.toLowerCase() !== 'critical' && r.status?.toLowerCase() !== 'verified').length || 0}</p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{t('verified')}</p>
            <p className="text-2xl font-bold mt-1">{reports?.filter((r: any) => r.status?.toLowerCase() === 'verified').length || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {isLoading ? (
        <FilterBarSkeleton />
      ) : (
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-white rounded-2xl">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchLocation')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer"
            >
              <option value="all">{t('allStatus')}</option>
              <option value="critical">{t('critical')}</option>
              <option value="verified">{t('verified')}</option>
              <option value="pending">{t('pending')}</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-medium ml-auto">
            {t('showing')} <span className="font-semibold text-slate-600">{reportCount}</span> {t('of')} {totalCount} {t('reportsLower')}
          </div>
        </div>
      )}

      {/* Reports grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {[1,2,3,4,5,6].map(i => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredReports?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">{t('noReports')}</h3>
          <p className="text-sm text-slate-500">{t('adjustSearch')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filteredReports?.map((report: any) => {
            const status = getStatusBadge(report.status)
            const StatusIcon = status.icon
            const imageUrl = report.imageUri || report.processedImage || ''
            const displayImage = imageUrl.startsWith('http') 
              ? imageUrl 
              : imageUrl.startsWith('data:') 
                ? imageUrl 
                : imageUrl ? `data:image/jpeg;base64,${imageUrl}` : null

            return (
              <Link
                key={report._id}
                href={`/reports/${report._id}`}
                className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-slate-200/80 transition-all duration-300"
              >
                <div className="relative h-44 bg-slate-100 overflow-hidden">
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
                      <MapPin className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1 group-hover:text-slate-700 transition-colors">
                    {report.locationName || t('unknownLocation')}
                  </h3>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {report.description || t('noDescription')}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {report.userName || t('unknown')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {report._creationTime ? new Date(report._creationTime).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 font-semibold">
                      <Eye className="h-3 w-3" />
                      {t('view')}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
