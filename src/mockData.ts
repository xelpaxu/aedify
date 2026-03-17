import breedingSite from "../public/assets/images/breeding-site.jpeg"
import profile from "../public/assets/images/profile.jpg"

const now = new Date();

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function formatTimestamp(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const formatted = date.toLocaleString("en-US", options);
  return formatted.replace(",", " •");
}

const baseReports = [
  {
    id: "#INC-2026-001",
    title: "Illegal Dumping Activity",
    location: "Zone 3, Brgy. Calumpang",
    classification: "Discarded Trash Bags",
    confidence: 94.2,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30 minutes ago
    coordinates: [10.6975, 122.5367],
    rawPhoto: breedingSite,
    objectsCount: "3 Bags",
  },
  {
    id: "#INC-2026-002",
    title: "Stagnant Water Pool",
    location: "Zone 4 Creek, Brgy. San Juan",
    classification: "Open Drainage",
    confidence: 78.0,
    risk: "Medium",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 120), // 2 hours ago
    coordinates: [10.6860, 122.5404],
    rawPhoto: breedingSite,
    objectsCount: "Stagnant Pool",
  },
  {
    id: "#INC-2026-003",
    title: "Discarded Vehicle Tires",
    location: "Vacant Lot, Brgy. South Fundidor",
    classification: "Tire Accumulation",
    confidence: 45.0,
    risk: "Low",
    status: "CLOSED",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 28), // 28 hours ago
    coordinates: [10.6883, 122.5312],
    rawPhoto: breedingSite,
    objectsCount: "4 Tires",
  },
  {
    id: "#INC-2026-004",
    title: "Clogged Drain Alert",
    location: "Brgy. Calumpang High School Gym",
    classification: "Clogged Drain",
    confidence: 88.0,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 34), // 34 hours ago
    coordinates: [10.6965, 122.5350],
    rawPhoto: breedingSite,
    objectsCount: "Drain Blockage",
  },
];

export const mockReports = baseReports.map((report) => ({
  ...report,
  confidence: `${report.confidence.toFixed(1)}%`,
  timeAgo: formatRelativeTime(report.timestamp),
  date: formatTimestamp(report.timestamp),
}));

export const mockAssignments = [
  {
    id: "#AS-2026-001",
    reportId: mockReports[0].id,
    assignee: { name: "Luis Mendoza", team: "Team Calumpang", avatar: profile },
    status: "Assigned",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 120)),
    completion: "—",
  },
  {
    id: "#AS-2026-002",
    reportId: mockReports[1].id,
    assignee: { name: "Leah Bautista", team: "Team San Juan", avatar: profile },
    status: "In Progress",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 180)),
    completion: "—",
  },
  {
    id: "#AS-2026-003",
    reportId: mockReports[2].id,
    assignee: { name: "Mark Alvarez", team: "Team South Fundidor", avatar: profile },
    status: "Completed",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2)),
    completion: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 24)),
  },
  {
    id: "#AS-2026-004",
    reportId: mockReports[3].id,
    assignee: null,
    status: "Pending",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 26)),
    completion: "—",
  },
];

export const mockDashboardActivities = mockReports
  .filter((report) => report.status === "OPEN")
  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  .slice(0, 3)
  .map((report, index) => ({
    id: index + 1,
    title: `${report.risk} Risk Site Detected`,
    time: report.timeAgo,
    location: report.location,
    severity: report.risk === "High" ? "High" : report.risk === "Medium" ? "Moderate" : "Low",
    thumbnail: report.rawPhoto,
  }));
