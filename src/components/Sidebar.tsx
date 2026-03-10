import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, PieChart, ClipboardList, Map, Briefcase, Settings, Activity, LogOut } from "lucide-react";
import { useAuth } from "../App";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { path: "/analytics", label: "Analytics", icon: <PieChart size={20} /> },
  { path: "/reports", label: "Reports", icon: <ClipboardList size={20} /> },
  { path: "/map", label: "Risk Map", icon: <Map size={20} /> },
  { path: "/assignments", label: "Assignments", icon: <Briefcase size={20} /> },
  { path: "/settings", label: "Settings", icon: <Settings size={20} /> },
];

export const Sidebar: React.FC = () => {
  const { role, logout } = useAuth();
  
  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/assignments' && (role === 'lgu-admin' || role === 'sys-admin')) return false;
    return true;
  });

  return (
    <aside className="w-[280px] h-full flex flex-col pt-8 pb-6 z-20 shrink-0 relative isolation-auto">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl border-r border-white/80 shadow-[12px_0_32px_-12px_rgba(0,0,0,0.05)] pointer-events-none -z-10" />

      <div className="px-8 mb-12 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg shadow-primary-600/30 ring-4 ring-primary-50">
          <Activity size={26} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 leading-none mb-1">Aedify.</h1>
          <p className="text-[10px] font-bold text-primary-600 tracking-[0.2em] uppercase">VEC-PRO System</p>
        </div>
      </div>

      <nav className="flex-1 px-5 space-y-1.5 w-full">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-300 group relative overflow-hidden ${isActive
                ? "text-primary-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-transparent pointer-events-none" />
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />
                )}
                <div className={`relative z-10 transition-transform duration-300 ${isActive ? "text-primary-600 scale-110" : "text-slate-400 group-hover:text-primary-500 group-hover:-translate-y-0.5"}`}>
                  {React.cloneElement(item.icon, { strokeWidth: isActive ? 2.5 : 2 })}
                </div>
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 mt-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-xl text-white mb-3">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">SYSTEM UPTIME</p>
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">MODELS ACTIVE</p>
              <p className="text-xs text-slate-400 mt-0.5">yolo, mobilenet, abm</p>
            </div>
          </div>
        </div>

        <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl font-bold transition-all text-sm group border border-transparent hover:border-rose-100">
          <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
          Terminate Session
        </button>
      </div>
    </aside>
  );
};