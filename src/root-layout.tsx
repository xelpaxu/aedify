import React from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { VerificationPage } from "./pages/VerificationPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { RiskMapPage } from "./pages/RiskMapPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

type SectionId =
  | "dashboard"
  | "reports"
  | "verification"
  | "assignments"
  | "risk-map"
  | "analytics";

const sections: { id: SectionId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "reports", label: "Reports" },
  { id: "verification", label: "Verification" },
  { id: "assignments", label: "Assignments" },
  { id: "risk-map", label: "Risk Map" },
  { id: "analytics", label: "Analytics" },
];

const pageMeta: Record<SectionId, { title: string; subtitle: string }> = {
  dashboard: { title: "Barangay Administrator", subtitle: "Welcome back, admin" },
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