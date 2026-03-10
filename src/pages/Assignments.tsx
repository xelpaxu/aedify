import React, { useState } from "react";
import { mockAssignments } from "../mockData";
import { Link } from "react-router-dom";
import { Search, Filter, Plus, FileText, CheckCircle2, Users, ExternalLink, Eye, PenLine, UserPlus, X } from "lucide-react";

export default function Assignments() {
  const [tasks, setTasks] = useState(mockAssignments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAssignee, setNewAssignee] = useState("");

  const handleCreateMock = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newAssignee) return;
     
     const newTask = {
        id: `#AS-10${Math.floor(Math.random() * 90) + 10}`,
        reportId: `#RP-${Math.floor(Math.random() * 900) + 100}`,
        assignee: { name: newAssignee, team: "Team Delta", avatar: "https://i.pravatar.cc/150?u=delta" },
        status: "Assigned",
        assignedDate: "Oct 25, 2023",
        completion: "—"
     };

     setTasks([newTask, ...tasks]);
     setIsModalOpen(false);
     setNewAssignee("");
  };

  return (
    <div className="h-full flex flex-col p-6 pt-2 w-full animate-in fade-in duration-500 overflow-y-auto max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1">Active Dispatches</h2>
          <p className="text-sm font-medium text-slate-500">Manage vector operations and tracking progress.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
             <Filter size={16} /> Data Filters
          </button>
          <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(8,145,178,0.3)] transition-all active:scale-95"
          >
             <Plus size={16} strokeWidth={3} /> Issue Order
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
         <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white group">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Active</span>
               <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 shadow-sm border border-primary-100 flex items-center justify-center">
                  <FileText size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-black text-slate-900 leading-none">{tasks.length + 119}</span>
               <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><span className="text-[10px]">↗</span> +12% vs prev obj</span>
            </div>
         </div>
         {/* ... (Other cards with identical robust layout update) ... */}
         <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Awaiting Sweep</span>
               <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 shadow-sm border border-amber-100 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">28</span>
               <span className="text-xs font-bold text-slate-400">Require onsite validation</span>
            </div>
         </div>
         <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Abated Sites</span>
               <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">15</span>
               <span className="text-xs font-bold text-slate-400">94% target abatement rate</span>
            </div>
         </div>
         <div className="glass p-5 flex flex-col justify-between rounded-2xl shadow-sm border border-slate-100 bg-white">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Unit Availability</span>
               <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 shadow-sm border border-indigo-100 flex items-center justify-center">
                  <Users size={16} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex flex-col justify-end">
               <span className="text-4xl font-black text-slate-900 leading-none mb-1">8<span className="text-slate-400 font-medium">/12</span></span>
               <span className="text-xs font-bold text-slate-400">Operational field cohorts</span>
            </div>
         </div>
      </div>

      {/* Main Table Container */}
      <div className="glass bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100/60 flex items-center justify-between shrink-0 bg-white/50">
           <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search orders..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 placeholder:text-slate-400 shadow-sm transition-all" />
           </div>
           <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sequence:</span>
              <select className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl py-2.5 px-4 shadow-sm outline-none cursor-pointer focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all">
                 <option>Date (Newest)</option>
              </select>
           </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
             <thead className="bg-slate-50/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
               <tr>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Order ID</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Source Report</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Designated Unit</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status Matrix</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Dispatch Date</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Clearance Ext.</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100/50 bg-white/40">
               {tasks.map((task, i) => (
                 <tr key={i} className="hover:bg-white transition-colors group">
                   <td className="px-8 py-6 text-sm font-black text-slate-800">{task.id}</td>
                   <td className="px-8 py-6">
                     <Link to={`/reports`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold hover:bg-primary-600 hover:text-white transition-all shadow-sm border border-primary-100 group-hover:border-primary-200">
                        {task.reportId} <ExternalLink size={12} />
                     </Link>
                   </td>
                   <td className="px-8 py-6">
                      {task.assignee ? (
                        <div className="flex items-center gap-4">
                           <img src={task.assignee.avatar} alt="Avatar" className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:scale-105 transition-transform" />
                           <div className="flex flex-col">
                             <span className="text-sm font-black text-slate-900 leading-tight">{task.assignee.name}</span>
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{task.assignee.team}</span>
                           </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center text-slate-400 font-bold text-xs shadow-inner">
                              --
                           </div>
                           <div className="flex flex-col">
                             <span className="text-sm font-black text-slate-400 leading-tight">Awaiting Unit</span>
                             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Queue Pool</span>
                           </div>
                        </div>
                      )}
                   </td>
                   <td className="px-8 py-6">
                     <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-black border shadow-sm
                       ${task.status === 'Assigned' ? 'bg-primary-50 text-primary-700 border-primary-200/50' :
                         task.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                         task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                         'bg-white text-slate-600 border-slate-200 dashed'
                       }
                     `}>
                       <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                         task.status === 'Assigned' ? 'bg-primary-500 shadow-primary-500/50' :
                         task.status === 'In Progress' ? 'bg-amber-500 shadow-amber-500/50' :
                         task.status === 'Completed' ? 'bg-emerald-500 shadow-emerald-500/50' :
                         'bg-slate-300'
                       }`} />
                       {task.status}
                     </span>
                   </td>
                   <td className="px-8 py-6 text-xs text-slate-600 font-bold whitespace-nowrap">
                     {task.assignedDate}
                   </td>
                   <td className="px-8 py-6 text-xs font-black text-slate-900 whitespace-nowrap">
                     {task.completion}
                   </td>
                   <td className="px-8 py-6 text-right">
                     {task.status === "Pending" ? (
                        <button className="text-slate-400 hover:text-primary-600 transition-colors p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50"><UserPlus size={16} /></button>
                     ) : task.status === "Completed" ? (
                        <button className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-200"><Eye size={16} /></button>
                     ) : (
                        <button className="text-slate-400 hover:text-primary-600 transition-colors p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50"><PenLine size={16} /></button>
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-slate-200/60 px-8 py-5 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Displaying <span className="text-slate-800">1-5</span> of <span className="text-slate-800">{tasks.length}</span> Active</p>
           
           <div className="flex gap-1.5">
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 bg-white shadow-sm hover:bg-slate-50 transition-all font-bold">{"<"}</button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-primary-600 bg-primary-600 text-white font-black shadow-[0_4px_10px_rgba(8,145,178,0.3)] transition-all">1</button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 font-black bg-white shadow-sm hover:bg-slate-50 transition-all">2</button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 font-black bg-white shadow-sm hover:bg-slate-50 transition-all">3</button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 bg-white shadow-sm hover:bg-slate-50 transition-all font-bold">{">"}</button>
           </div>
        </div>
      </div>

      {/* Mock Create Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
           
           {/* Modal Form */}
           <div className="relative glass bg-white w-full max-w-md rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Issue Dispatch Order</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Action Pool</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                    <X size={18} />
                 </button>
              </div>
              
              <form onSubmit={handleCreateMock} className="p-6 space-y-5 bg-slate-50/50">
                 <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Designated Operative Name</label>
                    <input 
                       autoFocus
                       required
                       type="text" 
                       value={newAssignee}
                       onChange={(e) => setNewAssignee(e.target.value)}
                       placeholder="e.g. John Doe"
                       className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm" 
                    />
                 </div>
                 <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Target Ref Report</label>
                    <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 border-dashed rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed">
                       Auto-assigned sequentially
                    </div>
                 </div>
                 <div className="pt-2">
                    <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-3.5 rounded-xl shadow-[0_4px_16px_rgba(8,145,178,0.3)] transition-all active:scale-95 text-sm uppercase tracking-wider">
                       Authorize & Deploy
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
