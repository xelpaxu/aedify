'use client'

import React from "react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend, trendUp }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      {(subtitle || trend) && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{subtitle}</span>
          {trend && (
            <div className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {trendUp ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              )}
              {trend}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
