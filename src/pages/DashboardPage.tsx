import type React from "react";
import { ClipboardList, BadgeCheck, TriangleAlert, Trash2 } from "lucide-react";

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800">Barangay Risk Overview</h2>
      <p className="mt-1 text-sm text-slate-500">Monitoring mosquito breeding site reports in your barangay.</p>

      <div className="mt-7 grid gap-8 md:grid-cols-4">
        {/* Pending Verification */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-2">
              <ClipboardList size={20} className="text-orange-500" />
            </div>
            <span className="text-xs font-medium text-emerald-500">+2 new</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">Pending Verification</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">12</p>
        </div>

        {/* Verified Reports */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-2">
              <BadgeCheck size={20} className="text-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Verified Reports</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">45</p>
        </div>

        {/* High-Risk Sites */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-red-100 p-2">
              <TriangleAlert size={20} className="text-red-500" />
            </div>
            <span className="text-xs font-medium text-red-500">High Priority</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">High-Risk Sites</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">8</p>
        </div>

        {/* Active Cleanup Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Trash2 size={20} className="text-emerald-500" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Active Cleanup Assignments</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">5</p>
        </div>
      </div>
    </div>
  );
};