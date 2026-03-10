import React from 'react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  FileText, AlertTriangle, ClipboardList, 
  ChevronRight, ShieldCheck, TrendingUp 
} from 'lucide-react';

// --- Types ---
interface Report {
  id: string;
  location: string;
  risk: 'High' | 'Medium' | 'Low';
  status: 'Pending Review' | 'Verified' | 'Resolved' | 'Cleanup Assigned';
  date: string;
}

// --- Data ---
const SUMMARY_STATS = [
  { label: 'Pending Verification', count: 12, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+2 new' },
  { label: 'Verified Reports', count: 45, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'High-Risk Sites', count: 8, icon: AlertTriangle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Active Cleanup', count: 5, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const WEEKLY_DATA = [
  { name: 'W1', reports: 40 }, { name: 'W2', reports: 65 },
  { name: 'W3', reports: 45 }, { name: 'W4', reports: 80 },
  { name: 'W5', reports: 60 }, { name: 'W6', reports: 95 },
];

const RISK_DATA = [
  { name: 'High', value: 35, color: '#4F46E5' },
  { name: 'Medium', value: 25, color: '#818CF8' },
  { name: 'Low', value: 40, color: '#C7D2FE' },
];

const RECENT_REPORTS: Report[] = [
  { id: '#RPT-2024-001', location: 'Purok 3, Near Old School', risk: 'High', status: 'Pending Review', date: 'Oct 24, 2023' },
  { id: '#RPT-2024-002', location: 'Street 4, Lot 2', risk: 'Medium', status: 'Verified', date: 'Oct 23, 2023' },
  { id: '#RPT-2024-003', location: 'Sitio Dulo, Block 1', risk: 'Low', status: 'Resolved', date: 'Oct 22, 2023' },
  { id: '#RPT-2024-004', location: 'Main Road, Construction Site', risk: 'High', status: 'Cleanup Assigned', date: 'Oct 21, 2023' },
];

export const DashboardPage: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Track and manage your barangay's health monitoring status.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SUMMARY_STATS.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {stat.trend && (
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp size={12} /> {stat.trend}
                </span>
              )}
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Submission Trends</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="reports" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h2 className="text-lg font-bold w-full mb-6">Risk Profile</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={RISK_DATA} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {RISK_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">Recent Field Reports</h2>
          <button className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
            View All Reports <ChevronRight size={16} />
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-8 py-4">Report ID</th>
              <th className="px-8 py-4">Location</th>
              <th className="px-8 py-4">Risk Level</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {RECENT_REPORTS.map((row) => (
              <tr key={row.id} className="hover:bg-indigo-50/20 transition">
                <td className="px-8 py-5 text-sm font-bold text-slate-900">{row.id}</td>
                <td className="px-8 py-5 text-sm text-slate-600">{row.location}</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600">
                    {row.risk}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm text-slate-600">{row.status}</td>
                <td className="px-8 py-5 text-right">
                  <button className="text-indigo-600 text-sm font-bold hover:underline">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};