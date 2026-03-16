import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import DashboardPage from "./pages/Dashboard";
import AnalyticsPage from "./pages/Analytics";
import ReportsPage from "./pages/Reports";
import RiskMapPage from "./pages/RiskMap";
import AssignmentsPage from "./pages/Assignments";
import SettingsPage from "./pages/Settings";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "./App";
import profile from "../public/assets/images/profile.jpg";

export const RootLayout: React.FC = () => {
  const { role } = useAuth();

  const getProfileTitle = () => {
    switch (role) {
      case 'lgu-admin': return 'LGU Admin';
      case 'brgy-calumpang': return 'Brgy Admin';
      case 'brgy-sanjuan': return 'Brgy Admin';
      case 'brgy-southfundidor': return 'Brgy Admin';
      case 'sys-admin': return 'System Admin';
      default: return 'User';
    }
  }

  const getProfileDesc = () => {
    switch (role) {
      case 'lgu-admin': return 'Molo District, Iloilo';
      case 'brgy-calumpang': return 'Calumpang, Molo';
      case 'brgy-sanjuan': return 'San Juan, Molo';
      case 'brgy-southfundidor': return 'South Fundidor, Molo';
      case 'sys-admin': return 'Global Root Access';
      default: return '';
    }
  }

  const getTopTitle = () => {
    if (role?.startsWith('brgy')) return 'Barangay Surveillance';
    if (role === 'sys-admin') return 'Global Root System';
    return 'LGU Surveillance Node';
  }

  return (
    <div className="flex relative h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-primary-500/30">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50">
        <header className="h-[88px] shrink-0 px-8 flex items-center justify-between glass-panel mx-6 mt-6 mb-4 z-10 
                           shadow-[0_4px_32px_-12px_rgba(0,0,0,0.1)] border border-white/80">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-none mb-1">Aedify Interface</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{getTopTitle()}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2.5 bg-white/60 hover:bg-white rounded-xl text-slate-400 hover:text-primary-600 transition-all border border-slate-100 shadow-sm shadow-slate-200/50">
              <Bell size={20} />
              <span className="absolute max-w-none top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white"></span>
              </span>
            </button>

            <div className="w-px h-8 bg-slate-200/60" />

            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{getProfileTitle()}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md inline-block border border-primary-100">{getProfileDesc()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-200 border-2 border-white shadow-md flex items-center justify-center overflow-hidden group-hover:shadow-primary-600/20 transition-all group-hover:-translate-y-0.5">
                <img src={profile} alt="profile" className="w-full h-full object-cover" />
              </div>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors ml-1" />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 pb-6 pt-2 scroll-smooth">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/map" element={<RiskMapPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </section>
      </main>
    </div>
  );
};