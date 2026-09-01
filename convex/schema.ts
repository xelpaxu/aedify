import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    uid: v.optional(v.string()),
    username: v.optional(v.string()),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    barangay: v.optional(v.string()),
    role: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    location: v.optional(v.string()),
    profileComplete: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_uid", ["uid"])
    .index("by_email", ["email"]),

  teams: defineTable({
    name: v.string(),
    barangay: v.optional(v.string()),
    region: v.string(),
    avatar: v.string(),
    leaderId: v.optional(v.string()),
    memberIds: v.optional(v.array(v.string())),
    memberNames: v.optional(v.array(v.string())),
  })
    .index("by_barangay", ["barangay"]),

  reports: defineTable({
    clerkUserId: v.optional(v.string()),
    userId: v.string(),
    userName: v.string(),
    description: v.string(),
    imageUri: v.string(),
    processedImage: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    accuracy: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    detections: v.optional(v.array(v.any())),
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    status: v.string(),
    barangay: v.optional(v.string()),
    public: v.optional(v.boolean()),
    resolutionImage: v.optional(v.string()),
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_barangay", ["barangay"])
    .index("by_status", ["status"]),

  assignments: defineTable({
    reportId: v.id("reports"),
    teamId: v.id("teams"),
    status: v.string(),
    assignedAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_reportId", ["reportId"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    reportId: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),
});