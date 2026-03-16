import breedingSite from "../public/assets/images/breeding-site.jpeg"
import profile from "../public/assets/images/profile.jpg"

export const mockReports = [
  {
    id: "#INC-2023-001",
    title: "Illegal Dumping Activity",
    location: "Zone 3, Brgy. Calumpang",
    classification: "Discarded Trash Bags",
    confidence: "94.2%",
    risk: "High",
    status: "OPEN",
    timeAgo: "2h ago",
    date: "Oct 24, 2023 \u2022 10:42 AM",
    coordinates: [10.6975, 122.5367],
    rawPhoto: breedingSite,
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
    coordinates: [10.6860, 122.5404],
    rawPhoto: breedingSite,
    objectsCount: "Stagnant Pool",
  },
  {
    id: "#INC-2023-003",
    title: "Discarded Vehicle Tires",
    location: "Vacant Lot, Brgy. South Fundidor",
    classification: "Tire Accumulation",
    confidence: "45%",
    risk: "Low",
    status: "CLOSED",
    timeAgo: "Yesterday",
    date: "Oct 23, 2023 \u2022 02:30 PM",
    coordinates: [10.6883, 122.5312],
    rawPhoto: breedingSite,
    objectsCount: "4 Tires",
  },
  {
    id: "#INC-2023-004",
    title: "Clogged Drain Alert",
    location: "Brgy. Calumpang High School Gym",
    classification: "Clogged Drain",
    confidence: "88%",
    risk: "High",
    status: "OPEN",
    timeAgo: "Yesterday",
    date: "Oct 23, 2023 \u2022 08:00 AM",
    coordinates: [10.6965, 122.5350],
    rawPhoto: breedingSite,
    objectsCount: "Drain Blockage",
  }
];

export const mockAssignments = [
  {
    id: "#AS-1024",
    reportId: "#RP-889",
    assignee: { name: "Jawross Palvric", team: "Team Calumpang", avatar: profile },
    status: "Assigned",
    assignedDate: "Oct 12, 2023",
    completion: "—"
  },
  {
    id: "#AS-1025",
    reportId: "#RP-901",
    assignee: { name: "Joerows Pal", team: "Team San Juan", avatar: profile },
    status: "In Progress",
    assignedDate: "Oct 11, 2023",
    completion: "—"
  },
  {
    id: "#AS-1020",
    reportId: "#RP-850",
    assignee: { name: "Juros Palvric", team: "Team South Fundidor", avatar: profile },
    status: "Completed",
    assignedDate: "Oct 10, 2023",
    completion: "Oct 12, 2023"
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
    location: "Brgy. Calumpang",
    severity: "High",
    thumbnail: mockReports[0].rawPhoto
  },
  {
    id: 2,
    title: "Moderate risk site detected",
    time: "45 mins ago",
    location: "Brgy. San Juan",
    severity: "Moderate",
    thumbnail: mockReports[1].rawPhoto
  },
  {
    id: 3,
    title: "Site verified and cleared",
    time: "2 hours ago",
    location: "Brgy. South Fundidor",
    severity: "Low",
    thumbnail: mockReports[2].rawPhoto
  }
];
