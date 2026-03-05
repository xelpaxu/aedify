import React from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { VerificationPage } from "./pages/VerificationPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { RiskMapPage } from "./pages/RiskMapPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LayoutDashboard, FileText, ShieldCheck, ClipboardList, Map, BarChart2, Bell } from "lucide-react";

type SectionId =
  | "dashboard"
  | "reports"
  | "verification"
  | "assignments"
  | "risk-map"
  | "analytics";

const sections: { id: SectionId; label: string; icon?: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "reports", label: "Reports", icon: <FileText size={18} /> },
  { id: "verification", label: "Verification", icon: <ShieldCheck size={18} /> },
  { id: "assignments", label: "Assignments", icon: <ClipboardList size={18} /> },
  { id: "risk-map", label: "Risk Map", icon: <Map size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
];

const pageMeta: Record<SectionId, { title: string; subtitle: string }> = {
  dashboard: { title: "Barangay Administrator", subtitle: "Welcome back, Admin" },
  reports: { title: "Reports", subtitle: "View and manage all reports" },
  verification: { title: "Verification", subtitle: "Verify submitted reports" },
  assignments: { title: "Assignments", subtitle: "Manage team assignments" },
  "risk-map": { title: "Risk Map", subtitle: "View dengue risk areas" },
  analytics: { title: "Analytics", subtitle: "Insights and statistics" },
};

export const RootLayout: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState<SectionId>("dashboard");
  const ActivePage = pagesBySectionId[activeSection];

  return (
    <div className="flex h-screen bg-white text-slate-900">
      <Sidebar
        sections={sections}
        activeId={activeSection}
        onSelect={(id) => setActiveSection(id as SectionId)}
      />

      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="text-lg font-semibold">{pageMeta[activeSection].title}</h1>
            <p className="text-sm text-slate-400">{pageMeta[activeSection].subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative rounded-full p-2 hover:bg-slate-100 transition">
              <Bell size={20} className="text-slate-500" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200" />

            {/* Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">Maria Santos</p>
                <p className="text-xs text-slate-400">Brgy. Poblacion</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden">
                <img
                  src="src/img/profile.jpg"
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="p-6">
          <ActivePage />
        </section>
      </main>
    </div>
  );
};

const pagesBySectionId: Record<SectionId, React.FC> = {
  dashboard: DashboardPage,
  reports: ReportsPage,
  verification: VerificationPage,
  assignments: AssignmentsPage,
  "risk-map": RiskMapPage,
  analytics: AnalyticsPage,
};