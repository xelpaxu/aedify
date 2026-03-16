import React from 'react';
import { useAuth, Role } from '../App';
import { ShieldCheck, Map, Users, Activity } from 'lucide-react';
import logo from "../../public/assets/images/favicon.ico";

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
       {/* aesthetics */}
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-50 to-white/50 z-0"></div>
       <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary-200/40 rounded-full blur-[100px] z-0 pointer-events-none"></div>

       <div className="relative z-10 text-center mb-10">
          <div className="w-20 h-20 mx-auto rounded-[24px] bg-none flex items-center justify-center text-white mb-6">
               <img src={logo} alt="Aedify Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Aedify.</h1>
          <p className="text-sm font-bold text-primary-600 tracking-[0.2em] uppercase">VEC-PRO authentication</p>
       </div>

       <div className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[32px] p-8">
          <h2 className="text-lg font-black text-slate-800 mb-6 text-center">Select Local Node Identity</h2>
          
          <div className="space-y-4">
             <button onClick={() => login('lgu-admin')} className="w-full flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-300 p-4 rounded-2xl shadow-sm transition-all group hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                   <Map size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-sm font-extrabold text-slate-900 leading-tight">LGU Admin</p>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Molo District, Iloilo City</p>
                </div>
             </button>

             <button onClick={() => login('brgy-calumpang')} className="w-full flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-300 p-4 rounded-2xl shadow-sm transition-all group hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                   <Users size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-sm font-extrabold text-slate-900 leading-tight">Barangay Admin</p>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calumpang, Molo</p>
                </div>
             </button>

             <button onClick={() => login('brgy-sanjuan')} className="w-full flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-300 p-4 rounded-2xl shadow-sm transition-all group hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-sm">
                   <Users size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-sm font-extrabold text-slate-900 leading-tight">Barangay Admin</p>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">San Juan, Molo</p>
                </div>
             </button>

             <button onClick={() => login('brgy-southfundidor')} className="w-full flex items-center gap-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-300 p-4 rounded-2xl shadow-sm transition-all group hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-sm">
                   <Users size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-sm font-extrabold text-slate-900 leading-tight">Barangay Admin</p>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">South Fundidor, Molo</p>
                </div>
             </button>

             <button onClick={() => login('sys-admin')} className="w-full flex items-center gap-4 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all group hover:-translate-y-1 mt-6 border border-slate-700">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shadow-inner">
                   <ShieldCheck size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-sm font-extrabold leading-tight">System Admin</p>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Global Root Access</p>
                </div>
             </button>
          </div>
       </div>
    </div>
  )
}
