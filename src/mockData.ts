export const mockReports = [
  {
    id: "#INC-2023-001",
    title: "Illegal Dumping Activity",
    location: "Corner of Mabini & Rizal St.",
    classification: "Discarded Trash Bags",
    confidence: "94.2%",
    risk: "High",
    status: "OPEN",
    timeAgo: "2h ago",
    date: "Oct 24, 2023 \u2022 10:42 AM",
    coordinates: [14.5995, 120.9842],
    rawPhoto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600",
    objectsCount: "3 Bags",
  },
  {
    id: "#INC-2023-002",
    title: "Stagnant Water Pool",
    location: "Zone 4 Creek, Brgy. San Juan",
    classification: "Open Drainage",
    confidence: "78%",
    risk: "Medium",
    status: "OPEN",
    timeAgo: "4h ago",
    date: "Oct 24, 2023 \u2022 08:15 AM",
    coordinates: [14.6050, 120.9890],
    rawPhoto: "https://images.unsplash.com/photo-1621252179027-94459d278660?auto=format&fit=crop&q=80&w=600",
    objectsCount: "Stagnant Pool",
  },
  {
    id: "#INC-2023-003",
    title: "Discarded Vehicle Tires",
    location: "Vacant Lot, Quezon Ave.",
    classification: "Tire Accumulation",
    confidence: "45%",
    risk: "Low",
    status: "CLOSED",
    timeAgo: "Yesterday",
    date: "Oct 23, 2023 \u2022 02:30 PM",
    coordinates: [14.6300, 121.0300],
    rawPhoto: "https://images.unsplash.com/photo-1584443916940-10ff98ae7bf8?auto=format&fit=crop&q=80&w=600",
    objectsCount: "4 Tires",
  },
  {
    id: "#INC-2023-004",
    title: "Flooding Alert",
    location: "Lower Antipolo, Rizal",
    classification: "Clogged Drain",
    confidence: "88%",
    risk: "High",
    status: "OPEN",
    timeAgo: "Yesterday",
    date: "Oct 23, 2023 \u2022 08:00 AM",
    coordinates: [14.5500, 121.0500],
    rawPhoto: "https://images.unsplash.com/photo-1542152069-7c1ec0dd4471?auto=format&fit=crop&q=80&w=600",
    objectsCount: "Drain Blockage",
  }
];

export const mockAssignments = [
  { 
    id: "#AS-1024", 
    reportId: "#RP-889", 
    assignee: { name: "Michael Foster", team: "Team Alpha", avatar: "https://i.pravatar.cc/150?u=a" },
    status: "Assigned", 
    assignedDate: "Oct 12, 2023",
    completion: "—"
  },
  { 
    id: "#AS-1025", 
    reportId: "#RP-901", 
    assignee: { name: "Lindsay Walton", team: "Team Beta", avatar: "https://i.pravatar.cc/150?u=b" },
    status: "In Progress", 
    assignedDate: "Oct 11, 2023",
    completion: "—"
  },
  { 
    id: "#AS-1020", 
    reportId: "#RP-850", 
    assignee: { name: "Courtney Henry", team: "Team Alpha", avatar: "https://i.pravatar.cc/150?u=c" },
    status: "Completed", 
    assignedDate: "Oct 10, 2023",
    completion: "Oct 12, 2023"
  },
  { 
    id: "#AS-1018", 
    reportId: "#RP-842", 
    assignee: { name: "Tom Cook", team: "Team Charlie", avatar: "https://i.pravatar.cc/150?u=d" },
    status: "Completed", 
    assignedDate: "Oct 09, 2023",
    completion: "Oct 10, 2023"
  },
  { 
    id: "#AS-1015", 
    reportId: "#RP-830", 
    assignee: null,
    status: "Pending", 
    assignedDate: "Oct 08, 2023",
    completion: "—"
  }
];

export const mockDashboardActivities = [
  {
    id: 1,
    title: "High-risk breeding site detected",
    time: "10 mins ago",
    location: "Jaro Plaza",
    severity: "High",
    thumbnail: mockReports[0].rawPhoto
  },
  {
    id: 2,
    title: "Moderate risk site detected",
    time: "45 mins ago",
    location: "Molo District",
    severity: "Moderate",
    thumbnail: mockReports[1].rawPhoto
  },
  {
    id: 3,
    title: "Site verified and cleared",
    time: "2 hours ago",
    location: "Mandurriao",
    severity: "Low",
    thumbnail: mockReports[2].rawPhoto
  }
];
