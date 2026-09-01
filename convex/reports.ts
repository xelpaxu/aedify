import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get a single report by ID
export const getReport = query({
  args: { id: v.id("reports") },
  handler: async (ctx, { id }) => {
    const report = await ctx.db.get(id);
    if (!report) return null;
    return report;
  },
});

// Get all reports
export const getAllReports = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db.query("reports").collect();
    // ✅ Log the size of image data to debug
    reports.forEach(r => {
      if (r.imageUri) {
        console.log(`Report ${r._id} image size: ${r.imageUri.length} characters`);
      }
    });
    return reports;
  },
});

export const getReportImage = query({
  args: { id: v.id("reports") },
  handler: async (ctx, { id }) => {
    const report = await ctx.db.get(id);
    if (!report) return null;
    return {
      imageUri: report.imageUri || '',
      processedImage: report.processedImage || '',
    };
  },
});

// Get reports by current user
export const getMyReports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .collect();
    return reports;
  },
});

// Verify a report
export const verifyReport = mutation({
  args: { id: v.id("reports") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Report not found");
    
    await ctx.db.patch(id, { verified: true, status: "verified" });
    return { success: true };
  },
});

// Update a report
export const updateReport = mutation({
  args: {
    id: v.id("reports"),
    locationName: v.optional(v.string()),
    description: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Report not found");

    const updates: Record<string, any> = {};
    if (fields.locationName !== undefined) updates.locationName = fields.locationName;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.lat !== undefined) updates.lat = fields.lat;
    if (fields.lng !== undefined) updates.lng = fields.lng;
    if (fields.status !== undefined) updates.status = fields.status;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }
    return { success: true };
  },
});

// Create a new report
export const createReport = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    description: v.string(),
    imageUri: v.string(),
    processedImage: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    accuracy: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    status: v.string(),
    detections: v.optional(v.array(v.any())),
    clerkUserId: v.optional(v.string()),
    barangay: v.optional(v.string()),
    public: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("reports", {
      ...args,
      verified: args.verified || false,
      status: args.status || "pending",
      detections: args.detections || [],
      processedImage: args.processedImage || "",
      reasoning: args.reasoning || "",
      accuracy: args.accuracy || "",
      public: args.public || false,
    });
    return id;
  },
});

// Get reports by barangay
export const getReportsByBarangay = query({
  args: { barangay: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_barangay", (q) => q.eq("barangay", args.barangay))
      .collect();
  },
});

// Get public reports filtered by user's barangay
export const getPublicReports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user?.barangay) {
      return await ctx.db
        .query("reports")
        .filter((q) => q.eq(q.field("public"), true))
        .collect();
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_barangay", (q) => q.eq("barangay", user.barangay!))
      .filter((q) => q.eq(q.field("public"), true))
      .collect();
  },
});

// Get reports assigned to current user's team
export const getAssignedReports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user?.teamId) return [];

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_teamId", (q) => q.eq("teamId", user.teamId as any))
      .collect();

    const reports = [];
    for (const assignment of assignments) {
      const report = await ctx.db.get(assignment.reportId);
      if (report) {
        reports.push({
          ...report,
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
        });
      }
    }

    return reports;
  },
});

// Tanod resolve report
export const resolveReport = mutation({
  args: {
    reportId: v.id("reports"),
    resolutionImage: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user?.role !== "tanod" && user?.role !== "admin") {
      throw new Error("Only Tanod or Admin can resolve reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      status: "Resolved",
      resolutionImage: args.resolutionImage || "",
      resolvedBy: user.name || user.firstName || identity.name || identity.subject,
      resolvedAt: Date.now(),
    });

    // Also update any assignment for this report
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_reportId", (q) => q.eq("reportId", args.reportId))
      .collect();

    for (const a of assignments) {
      await ctx.db.patch(a._id, { status: "Completed" });
    }

    // Notify report owner
    if (report.userId) {
      await ctx.db.insert("notifications", {
        userId: report.userId,
        type: "resolved",
        title: "Report Resolved",
        message: `Your report at ${report.locationName} has been resolved by Tanod team.`,
        reportId: args.reportId as string,
        read: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
