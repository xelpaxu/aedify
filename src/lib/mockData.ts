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
  // ─── CALUMPANG ─────────────────────────────────────────────────────────────
  {
    id: "#INC-2026-001",
    title: "Illegal Dumping Activity",
    location: "Zone 3, Brgy. Calumpang",
    barangay: "Brgy. Calumpang",
    classification: "Discarded Trash Bags",
    confidence: 94.2,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 30),
    coordinates: [10.6975, 122.5367],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "3 Bags",
  },
  {
    id: "#INC-2026-004",
    title: "Clogged Drain Alert",
    location: "Brgy. Calumpang High School Gym",
    barangay: "Brgy. Calumpang",
    classification: "Clogged Drain",
    confidence: 88.0,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 14),
    coordinates: [10.6965, 122.5350],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Drain Blockage",
  },
  {
    id: "#INC-2026-006",
    title: "Uncovered Water Drums",
    location: "Purok Riverside, Brgy. Calumpang",
    barangay: "Brgy. Calumpang",
    classification: "Open Water Drums",
    confidence: 91.5,
    risk: "Medium",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 26),
    coordinates: [10.6982, 122.5375],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "2 Drums",
  },
  {
    id: "#INC-2026-007",
    title: "Market Perimeter Canal",
    location: "Public Market Canal, Brgy. Calumpang",
    barangay: "Brgy. Calumpang",
    classification: "Stagnant Water Pool",
    confidence: 82.0,
    risk: "Low",
    status: "CLOSED",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48),
    coordinates: [10.6958, 122.5360],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Canal Treated",
  },

  // ─── SOUTH FUNDIDOR ────────────────────────────────────────────────────────
  {
    id: "#INC-2026-003",
    title: "Discarded Vehicle Tires Accumulation",
    location: "Vacant Lot, Brgy. South Fundidor",
    barangay: "Brgy. South Fundidor",
    classification: "Discarded Tires",
    confidence: 95.0,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 45),
    coordinates: [10.6883, 122.5312],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "6 Tires",
  },
  {
    id: "#INC-2026-008",
    title: "Blocked Coastal Drainage Channel",
    location: "Purok 2 Coastal Area, Brgy. South Fundidor",
    barangay: "Brgy. South Fundidor",
    classification: "Clogged Drainage",
    confidence: 89.4,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8),
    coordinates: [10.6895, 122.5305],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Clogged Outfall",
  },
  {
    id: "#INC-2026-009",
    title: "Uncovered Rainwater Collector Drums",
    location: "South Fundidor Elementary Perimeter",
    barangay: "Brgy. South Fundidor",
    classification: "Open Containers",
    confidence: 79.2,
    risk: "Medium",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 18),
    coordinates: [10.6872, 122.5320],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "3 Plastic Drums",
  },
  {
    id: "#INC-2026-010",
    title: "Stagnant Marsh Creek",
    location: "Fish Port Access Road, Brgy. South Fundidor",
    barangay: "Brgy. South Fundidor",
    classification: "Stagnant Pools",
    confidence: 92.0,
    risk: "Low",
    status: "CLOSED",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 52),
    coordinates: [10.6865, 122.5298],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Area Larvicided",
  },
  {
    id: "#INC-2026-011",
    title: "Illegal Trash & Container Dumping",
    location: "Zone 1 Alleyway, Brgy. South Fundidor",
    barangay: "Brgy. South Fundidor",
    classification: "Illegal Dumping",
    confidence: 86.5,
    risk: "Medium",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 30),
    coordinates: [10.6888, 122.5318],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "5 Waste Containers",
  },

  // ─── SAN JUAN ──────────────────────────────────────────────────────────────
  {
    id: "#INC-2026-002",
    title: "Stagnant Water Pool",
    location: "Zone 4 Creek, Brgy. San Juan",
    barangay: "Brgy. San Juan",
    classification: "Open Drainage",
    confidence: 78.0,
    risk: "Medium",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 120),
    coordinates: [10.6860, 122.5404],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Stagnant Pool",
  },
  {
    id: "#INC-2026-005",
    title: "Abandoned Construction Pit",
    location: "Community Plaza, Brgy. San Juan",
    barangay: "Brgy. San Juan",
    classification: "Stagnant Pools",
    confidence: 90.0,
    risk: "High",
    status: "OPEN",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 20),
    coordinates: [10.6852, 122.5395],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Water Pit",
  },
  {
    id: "#INC-2026-012",
    title: "Clogged Street Inlets",
    location: "San Juan Main Road, Brgy. San Juan",
    barangay: "Brgy. San Juan",
    classification: "Clogged Drainage",
    confidence: 84.0,
    risk: "Low",
    status: "CLOSED",
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 60),
    coordinates: [10.6870, 122.5412],
    rawPhoto: "/assets/images/breeding-site.jpeg",
    objectsCount: "Drain Flushed",
  },
];

export const mockReports = baseReports.map((report) => ({
  ...report,
  confidence: `${report.confidence.toFixed(1)}%`,
  timeAgo: formatRelativeTime(report.timestamp),
  date: formatTimestamp(report.timestamp),
}));

export const mockAssignments = [
  // Calumpang assignments
  {
    id: "#AS-2026-001",
    reportId: mockReports[0].id,
    assignee: { name: "Luis Mendoza", team: "Team Calumpang", avatar: "/assets/images/profile.jpg" },
    status: "In Progress",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 120)),
    completion: "—",
  },
  {
    id: "#AS-2026-004",
    reportId: mockReports[1].id,
    assignee: { name: "Carlos Reyes", team: "Team Calumpang", avatar: "/assets/images/profile.jpg" },
    status: "Assigned",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 10)),
    completion: "—",
  },
  {
    id: "#AS-2026-007",
    reportId: mockReports[3].id,
    assignee: { name: "Luis Mendoza", team: "Team Calumpang", avatar: "/assets/images/profile.jpg" },
    status: "Completed",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 48)),
    completion: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 36)),
  },

  // South Fundidor assignments
  {
    id: "#AS-2026-003",
    reportId: mockReports[4].id,
    assignee: { name: "Mark Alvarez", team: "Team South Fundidor", avatar: "/assets/images/profile.jpg" },
    status: "In Progress",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 6)),
    completion: "—",
  },
  {
    id: "#AS-2026-005",
    reportId: mockReports[5].id,
    assignee: { name: "Ramon Gomez", team: "Team South Fundidor", avatar: "/assets/images/profile.jpg" },
    status: "Assigned",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 5)),
    completion: "—",
  },
  {
    id: "#AS-2026-006",
    reportId: mockReports[7].id,
    assignee: { name: "Mark Alvarez", team: "Team South Fundidor", avatar: "/assets/images/profile.jpg" },
    status: "Completed",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 50)),
    completion: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 38)),
  },

  // San Juan assignments
  {
    id: "#AS-2026-002",
    reportId: mockReports[9].id,
    assignee: { name: "Leah Bautista", team: "Team San Juan", avatar: "/assets/images/profile.jpg" },
    status: "In Progress",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 180)),
    completion: "—",
  },
  {
    id: "#AS-2026-008",
    reportId: mockReports[11].id,
    assignee: { name: "Leah Bautista", team: "Team San Juan", avatar: "/assets/images/profile.jpg" },
    status: "Completed",
    assignedDate: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 58)),
    completion: formatTimestamp(new Date(now.getTime() - 1000 * 60 * 60 * 46)),
  },
];

export const mockDashboardActivities = mockReports
  .filter((report) => report.status === "OPEN")
  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  .slice(0, 6)
  .map((report, index) => ({
    id: index + 1,
    title: `${report.risk} Risk Site Detected`,
    time: report.timeAgo,
    location: report.location,
    severity: report.risk === "High" ? "High" : report.risk === "Medium" ? "Moderate" : "Low",
    thumbnail: report.rawPhoto,
  }));
