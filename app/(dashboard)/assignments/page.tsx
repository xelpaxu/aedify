'use client'

import { useState } from "react"
import { useSearchParams } from 'next/navigation'
import { Search, FileText, CheckCircle2, Eye, X, UserPlus } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useLanguage } from '../../../src/lib/translations'

export default function AssignmentsPage() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get('reportId')
  const { t } = useLanguage()

  const assignments = useQuery(api.assignments.getActiveAssignments)
  const teams = useQuery(api.assignments.getAllTeams)
  const createAssignment = useMutation(api.assignments.createAssignment)
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [showAssignModal, setShowAssignModal] = useState(!!reportId)
  const [assignForm, setAssignForm] = useState({ teamId: "", reportIdLocal: reportId || "" })

  const filtered = (assignments || []).filter((a: any) => {
    const matchesSearch =
      (a.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.teamName || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "All" || a.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: assignments?.length || 0,
    pending: assignments?.filter((a: any) => a.status === "Assigned").length || 0,
    inProgress: assignments?.filter((a: any) => a.status === "In Progress").length || 0,
    completed: assignments?.filter((a: any) => a.status === "Completed").length || 0,
  }

  return (
    <div className="h-full flex flex-col animate-fade-in-up max-w-[1600px] w-full mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-0.5">{t('fieldAssignments')}</h1>
          <p className="text-sm text-slate-500">{t('manageDispatch')}</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-semibold active:scale-[0.98] text-sm"
        >
          <UserPlus size={16} /> {t('newAssignment')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 shrink-0 stagger-children">
        {[
          { label: t('total'), value: stats.total, color: "bg-slate-900 text-white" },
          { label: t('assigned'), value: stats.pending, color: "bg-amber-50 text-amber-700 border border-amber-200/60" },
          { label: t('inProgress'), value: stats.inProgress, color: "bg-blue-50 text-blue-700 border border-blue-200/60" },
          { label: t('completed'), value: stats.completed, color: "bg-emerald-50 text-emerald-700 border border-emerald-200/60" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchAssignments')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/60 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition"
          />
        </div>
        <div className="flex gap-0.5 bg-white p-1 rounded-xl border border-slate-200/60">
          {["All", t('assigned'), t('inProgress'), t('completed')].map((s, i) => {
            const values = ["All", "Assigned", "In Progress", "Completed"]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(values[i])}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase rounded-lg transition-all ${
                  filterStatus === values[i] ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200/60">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('assignment')}</th>
              <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('location')}</th>
              <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('team')}</th>
              <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('status')}</th>
              <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('reportStatus')}</th>
              <th className="text-right p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <span className="text-xs font-semibold text-slate-800 font-mono">{a._id.slice(0, 12)}...</span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-medium text-slate-600">{a.location || "—"}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                      {a.teamName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.teamName || t('unknown')}</p>
                      <p className="text-[10px] text-slate-400">{a.region || ""}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${
                    a.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                    a.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                    'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${
                    a.reportStatus === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                    'bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}>
                    {a.reportStatus || "—"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                      <Eye size={14} />
                    </button>
                    {a.status !== "Completed" && (
                      <button
                        onClick={async () => {
                          try {
                            await updateStatus({ assignmentId: a._id, status: "Completed" })
                          } catch (e) {
                            console.error(e)
                          }
                        }}
                        className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-slate-400 hover:text-emerald-600"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <FileText size={24} className="text-slate-300" />
            </div>
            <p className="font-semibold text-sm">{t('noAssignments')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">{t('newAssignment')}</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{t('convReportId')}</label>
                <input
                  type="text"
                  value={assignForm.reportIdLocal}
                  onChange={(e) => setAssignForm(f => ({ ...f, reportIdLocal: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition"
                  placeholder="Report ID"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{t('team')}</label>
                <select
                  value={assignForm.teamId}
                  onChange={(e) => setAssignForm(f => ({ ...f, teamId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition appearance-none"
                >
                  <option value="">{t('selectTeam')}</option>
                  {(teams || []).map((t: any) => (
                    <option key={t._id} value={t._id}>{t.name} — {t.region}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2.5">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200/60 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
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
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <UserPlus size={14} /> {t('assign')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
