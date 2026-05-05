import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, FileText, CheckCircle2, Users, ExternalLink, Eye, Zap, UserPlus, X, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Assignments() {
  const [searchParams] = useSearchParams();
  const targetReportId = searchParams.get("reportId");

  // 1. LIVE CONVEX DATA
  const activeAssignments = useQuery(api.assignments.getActiveAssignments);
  const teams = useQuery(api.assignments.getAllTeams);
  
  const createTeam = useMutation(api.assignments.addTeam);
  const createDispatch = useMutation(api.assignments.createAssignment);
  const updateStatus = useMutation(api.assignments.updateAssignmentStatus); // New Mutation

  // 2. MODAL STATES
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(!!targetReportId);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  
  // Form States
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamRegion, setNewTeamRegion] = useState("Molo");

  // 3. DERIVED METRICS
  const totalActive = activeAssignments?.length || 0;
  const awaitingSweep = activeAssignments?.filter((t) => t.status !== "Completed").length || 0;
  const abatedSites = activeAssignments?.filter((t) => t.status === "Completed").length || 0;
  const totalUnits = teams?.length || 0;
  const deployedUnits = [...new Set(activeAssignments?.map(a => a.teamId))].length;
  const completionRate = totalActive > 0 ? Math.round((abatedSites / totalActive) * 100) : 0;

  // 4. HANDLERS
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReportId || !selectedTeamId) return;
    await createDispatch({ 
      reportId: targetReportId as any, 
      teamId: selectedTeamId as any 
    });
    setIsDispatchModalOpen(false);
    window.history.replaceState({}, '', '/assignments');
  };

  const handleStatusUpdate = async (id: any, newStatus: string) => {
    if (window.confirm(`Mark dispatch as ${newStatus}?`)) {
      await updateStatus({ assignmentId: id, status: newStatus });
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam({
      name: newTeamName,
      region: newTeamRegion,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newTeamName}`
    });
    setIsTeamModalOpen(false);
    setNewTeamName("");
  };

  return (
    <div className="h-full flex flex-col p-6 pt-2 w-full animate-in fade-in duration-500 overflow-y-auto max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Active Dispatches</h2>
          <p className="text-sm font-medium text-slate-500">Manage vector operations and real-time unit tracking.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTeamModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <UserPlus size={16} /> Add Team
          </button>

          <button 
            onClick={() => setIsDispatchModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(8,145,178,0.3)] transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> Issue Order
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
          <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Active</span>
               <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
                  <FileText size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-black text-slate-900 leading-none">{totalActive}</span>
               <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">↗ {completionRate}% rate</span>
            </div>
          </div>
          
          <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Awaiting Sweep</span>
               <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">{awaitingSweep}</span>
               <span className="text-xs font-bold text-slate-400">Onsite validation required</span>
            </div>
          </div>

          <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Abated Sites</span>
               <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">{abatedSites}</span>
               <span className="text-xs font-bold text-slate-400">Successfully cleared</span>
            </div>
          </div>

          <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Unit Load</span>
               <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center justify-center">
                  <Users size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">{deployedUnits}<span className="text-slate-400 font-medium">/{totalUnits}</span></span>
               <span className="text-xs font-bold text-slate-400">Active field cohorts</span>
            </div>
          </div>
      </div>

      {/* Main Table Container */}
      <div className="glass bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100/60 flex items-center justify-between shrink-0 bg-white/50">
           <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search orders..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm transition-all" />
           </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
             <thead className="bg-slate-50/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
               <tr>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designated Unit</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100/50 bg-white/40">
               {activeAssignments?.map((task) => (
                 <tr key={task._id} className="hover:bg-white transition-colors group">
                   <td className="px-8 py-6 text-sm font-black text-slate-800">{task._id.slice(-6).toUpperCase()}</td>
                   <td className="px-8 py-6">
                     <Link to={`/reports`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold hover:bg-primary-600 hover:text-white transition-all">
                        {task.location} <ExternalLink size={12} />
                     </Link>
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <img src={task.teamAvatar} alt="Avatar" className="w-10 h-10 rounded-xl border border-slate-200" />
                         <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-900 leading-tight">{task.teamName}</span>
                           <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{task.region}</span>
                         </div>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                     <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-black border
                       ${task.status === 'Assigned' ? 'bg-primary-50 text-primary-700 border-primary-200/50' :
                         task.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                         'bg-emerald-50 text-emerald-700 border-emerald-200/50'}
                     `}>
                       {task.status}
                     </span>
                   </td>
                   <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.status !== 'Completed' && (
                          <button 
                            onClick={() => handleStatusUpdate(task._id, "Completed")}
                            title="Mark as Completed"
                            className="text-emerald-500 hover:text-white transition-colors p-2 bg-emerald-50 rounded-lg border border-emerald-100 hover:bg-emerald-500"
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>
                        )}
                        {task.status === 'Assigned' && (
                          <button 
                            onClick={() => handleStatusUpdate(task._id, "In Progress")}
                            title="Set to In Progress"
                            className="text-amber-500 hover:text-white transition-colors p-2 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-500"
                          >
                            <Zap size={16} fill="currentColor" />
                          </button>
                        )}
                        <button className="text-slate-400 hover:text-primary-600 transition-colors p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-primary-50">
                          <Eye size={16} />
                        </button>
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH ORDER MODAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDispatchModalOpen(false)} />
           <div className="relative glass bg-white w-full max-w-md rounded-[24px] shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Issue Dispatch Order</h3>
                <button onClick={() => setIsDispatchModalOpen(false)}><X size={20}/></button>
              </div>
              <form onSubmit={handleDispatch} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Target Report ID</label>
                  <input readOnly value={targetReportId || ""} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Assign Field Unit</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">Select a team...</option>
                    {teams?.map(team => (
                      <option key={team._id} value={team._id}>{team.name} ({team.region})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-primary-600 text-white font-black py-4 rounded-xl hover:bg-primary-700 transition-all shadow-lg">
                  Deploy Unit
                </button>
              </form>
           </div>
        </div>
      )}

      {/* REGISTER TEAM MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)} />
           <div className="relative glass bg-white w-full max-w-md rounded-[24px] shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Register New Team</h3>
                <button onClick={() => setIsTeamModalOpen(false)}><X size={20}/></button>
              </div>
              <form onSubmit={handleAddTeam} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Team Name</label>
                   <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="e.g. Unit Alpha" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Region</label>
                   <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newTeamRegion} onChange={(e) => setNewTeamRegion(e.target.value)}>
                      <option>Calumpang</option>
                      <option>San Juan</option>
                      <option>South Fundidor</option>
                   </select>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all">
                   Register Unit
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}