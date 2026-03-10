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
    <div className="glass p-7 group hover:-translate-y-1.5 transition-all duration-500 hover:shadow-xl hover:shadow-primary-500/5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-colors duration-500" />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white shadow-md shadow-slate-200/50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-500 group-hover:shadow-primary-600/30 group-hover:rotate-6">
          {icon}
        </div>
      </div>
      
      {(subtitle || trend) && (
        <div className="mt-6 flex items-center justify-between text-sm relative z-10">
          <span className="text-slate-500 font-medium">{subtitle}</span>
          {trend && (
            <div className={`flex items-center gap-1 font-bold px-2 py-1 rounded-lg ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {trendUp ? (
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              ) : (
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              )}
              {trend}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
