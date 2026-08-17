'use client'

import { useState } from "react"
import { useSearchParams } from 'next/navigation'
import { Search, FileText, CheckCircle2, Eye, X, UserPlus, Users, LayoutGrid, List, MapPin, Clock, ChevronRight, Plus, Check, Loader2 } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useLanguage } from '../../../src/lib/translations'
import Link from "next/link"

export default function AssignmentsPage() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get('reportId')
  const { t } = useLanguage()

  const assignments = useQuery(api.assignments.getActiveAssignments)
  const teams = useQuery(api.assignments.getAllTeams)
  const tanodUsers = useQuery(api.users.getTanodUsers)
  const createAssignment = useMutation(api.assignments.createAssignment)
  const createTeam = useMutation(api.assignments.addTeam)
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(!!reportId)
  const [assignForm, setAssignForm] = useState({ teamId: "", reportIdLocal: reportId || "" })

  // Create team modal
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamForm, setTeamForm] = useState({
    name: "",
    region: "",
    selectedMembers: [] as string[],
    leaderId: "",
  })
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

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

  const toggleMember = (userId: string) => {
    setTeamForm(f => {
      const selected = f.selectedMembers.includes(userId)
        ? f.selectedMembers.filter(id => id !== userId)
        : [...f.selectedMembers, userId]
      const leaderStillSelected = selected.includes(f.leaderId)
      return {
        ...f,
        selectedMembers: selected,
        leaderId: leaderStillSelected ? f.leaderId : "",
      }
    })
  }

  const handleCreateTeam = async () => {
    if (!teamForm.name || !teamForm.region || teamForm.selectedMembers.length === 0) return
    setIsCreatingTeam(true)
    try {
      const selectedTanods = (tanodUsers || []).filter((u: any) => teamForm.selectedMembers.includes(u._id))
      await createTeam({
        name: teamForm.name,
        region: teamForm.region,
        avatar: teamForm.name.charAt(0).toUpperCase(),
        leaderId: teamForm.leaderId,
        memberIds: teamForm.selectedMembers,
        memberNames: selectedTanods.map((u: any) => u.name),
      })
      setShowCreateTeam(false)
      setTeamForm({ name: "", region: "", selectedMembers: [], leaderId: "" })
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
      case 'In Progress': return 'bg-blue-50 text-blue-700 border border-blue-200/60'
      default: return 'bg-amber-50 text-amber-700 border border-amber-200/60'
    }
  }

  const getReportStatusColor = (status: string) => {
    if (status === 'CRITICAL') return 'bg-rose-50 text-rose-700 border border-rose-200/60'
    return 'bg-slate-100 text-slate-600 border border-slate-200/60'
  }

  return (
    <div className="h-full flex flex-col animate-fade-in-up max-w-[1600px] w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-0.5">{t('fieldAssignments')}</h1>
          <p className="text-sm text-slate-500">{t('manageDispatch')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTeam(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60 rounded-xl transition-all font-semibold active:scale-[0.98] text-sm"
          >
            <Users size={16} /> {t('addTeam')}
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-semibold active:scale-[0.98] text-sm"
          >
            <UserPlus size={16} /> {t('newAssignment')}
          </button>
        </div>
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

      {/* Filters + View toggle */}
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
        <div className="flex gap-0.5 bg-white p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((a: any) => (
              <Link
                key={a._id}
                href={`/assignments/${a._id}`}
                className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
                      {a.teamName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{a.teamName || t('unknown')}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{a.region}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${getStatusColor(a.status)}`}>
                    {a.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{a.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={12} className="shrink-0" />
                    <span>{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${getReportStatusColor(a.reportStatus)}`}>
                    {a.reportStatus || "—"}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('team')}</th>
                <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('location')}</th>
                <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('status')}</th>
                <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('reportStatus')}</th>
                <th className="text-left p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('date')}</th>
                <th className="text-right p-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: any) => (
                <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
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
                    <span className="text-xs font-medium text-slate-600">{a.location || "—"}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${getStatusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg uppercase ${getReportStatusColor(a.reportStatus)}`}>
                      {a.reportStatus || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-slate-500">
                      {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/assignments/${a._id}`}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                      >
                        <Eye size={14} />
                      </Link>
                      {a.status !== "Completed" && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
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
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-14 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="font-semibold text-sm">{t('noAssignments')}</p>
        </div>
      )}

      {/* ─── Create Team Modal ─── */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">{t('createTeam')}</h3>
              <button onClick={() => setShowCreateTeam(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{t('teamName')}</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition"
                  placeholder={t('teamNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{t('region')}</label>
                <select
                  value={teamForm.region}
                  onChange={(e) => setTeamForm(f => ({ ...f, region: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition appearance-none"
                >
                  <option value="">{t('selectRegion')}</option>
                  <option value="Calumpang">Calumpang, Molo</option>
                  <option value="San Juan">San Juan, Molo</option>
                  <option value="South Fundidor">South Fundidor, Molo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{t('selectMembers')}</label>
                <div className="space-y-1.5">
                  {(tanodUsers || []).map((user: any) => {
                    const isSelected = teamForm.selectedMembers.includes(user._id)
                    const isLeader = teamForm.leaderId === user._id
                    return (
                      <div
                        key={user._id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200/60 hover:border-slate-300'
                        }`}
                        onClick={() => toggleMember(user._id)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {user.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400">{user.location}</p>
                        </div>
                        {isSelected && (
                          <div className="shrink-0">
                            {isLeader ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">{t('leader')}</span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTeamForm(f => ({ ...f, leaderId: user._id }))
                                }}
                                className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                {t('setAsLeader')}
                              </button>
                            )}
                          </div>
                        )}
                        {isSelected && !isLeader && (
                          <Check size={14} className="text-slate-900 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
                {teamForm.selectedMembers.length > 0 && !teamForm.leaderId && (
                  <p className="text-[10px] text-amber-600 mt-2 font-medium">{t('selectLeaderHint')}</p>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2.5">
              <button
                onClick={() => setShowCreateTeam(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200/60 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                disabled={!teamForm.name || !teamForm.region || teamForm.selectedMembers.length === 0 || !teamForm.leaderId || isCreatingTeam}
                onClick={handleCreateTeam}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isCreatingTeam ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Users size={14} />
                )}
                {t('createTeam')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Modal ─── */}
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
                {(teams || []).length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Users size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">{t('noTeamsYet')}</p>
                    <button
                      onClick={() => { setShowAssignModal(false); setShowCreateTeam(true) }}
                      className="mt-2 text-xs font-semibold text-slate-900 hover:underline"
                    >
                      {t('createTeamFirst')}
                    </button>
                  </div>
                ) : (
                  <select
                    value={assignForm.teamId}
                    onChange={(e) => setAssignForm(f => ({ ...f, teamId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition appearance-none"
                  >
                    <option value="">{t('selectTeam')}</option>
                    {(teams || []).map((tm: any) => (
                      <option key={tm._id} value={tm._id}>{tm.name} — {tm.region}</option>
                    ))}
                  </select>
                )}
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
