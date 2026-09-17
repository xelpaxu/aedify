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

// Human validation replaces the AI assessment shown on the report.
export const modifyReport = mutation({
  args: {
    id: v.id("reports"),
    locationName: v.string(),
    description: v.string(),
    lat: v.number(),
    lng: v.number(),
    adminNotes: v.string(),
    analysisIssue: v.union(
      v.literal("wrong-class"), v.literal("wrong-detection"),
      v.literal("missed-detection"), v.literal("partially-correct"),
      v.literal("wrong-risk"), v.literal("details-only"),
    ),
    correctedClassification: v.string(),
    correctedFindings: v.string(),
    reviewedBy: v.string(),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Report not found");
    if (existing.status.toLowerCase() === "resolved") {
      throw new Error("Resolved reports cannot be modified for dispatch.");
    }
    if (!fields.adminNotes.trim() || !fields.locationName.trim()) {
      throw new Error("Location and admin validation notes are required.");
    }
    if (!fields.correctedClassification.trim() || !fields.correctedFindings.trim()) {
      throw new Error("Enter the correct classification and the admin-confirmed findings.");
    }
    if (!Number.isFinite(fields.lat) || Math.abs(fields.lat) > 90 ||
      !Number.isFinite(fields.lng) || Math.abs(fields.lng) > 180) {
      throw new Error("Enter valid latitude and longitude coordinates.");
    }
    await ctx.db.patch(id, {
      ...fields,
      locationName: fields.locationName.trim(),
      adminNotes: fields.adminNotes.trim(),
      correctedClassification: fields.correctedClassification.trim(),
      correctedFindings: fields.correctedFindings.trim(),
      reviewType: "admin-modified",
      reviewedAt: Date.now(),
      verified: true,
      status: "verified",
    });
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

    // Create system broadcast notification for incoming report
    const isCritical = args.status?.toLowerCase() === "critical";
    await ctx.db.insert("notifications", {
      userId: "all",
      type: isCritical ? "critical_report" : "new_report",
      title: isCritical ? "Critical Vector Hazard Reported" : "New Vector Hazard Reported",
      message: `New incident reported at ${args.locationName} (${args.detections?.[0] || 'Breeding Site'}).`,
      reportId: id as string,
      read: false,
      createdAt: Date.now(),
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

// Tanod/Admin resolve report with linked area resolution for all co-located incidents
export const resolveReport = mutation({
  args: {
    reportId: v.id("reports"),
    resolutionImage: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const resolverName = identity?.name || identity?.nickname || "Tanod Officer";

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    const now = Date.now();

    // 1. Find all co-located unresolved reports in the same area / coordinates
    const allReports = await ctx.db.query("reports").collect();
    const coLocatedReports = allReports.filter((r) => {
      if (r._id === report._id) return true;
      if (r.status?.toLowerCase() === "resolved" || r.status?.toLowerCase() === "completed") return false;

      const sameCoords =
        typeof r.lat === "number" &&
        typeof report.lat === "number" &&
        Math.abs(r.lat - report.lat) < 0.0005 &&
        Math.abs(r.lng - report.lng) < 0.0005;

      const sameLocation =
        r.locationName &&
        report.locationName &&
        r.locationName.trim().toLowerCase() === report.locationName.trim().toLowerCase();

      return sameCoords || sameLocation;
    });

    // 2. Resolve all co-located reports and complete their assignments
    for (const r of coLocatedReports) {
      await ctx.db.patch(r._id, {
        status: "Resolved",
        resolutionImage: args.resolutionImage || "",
        resolvedBy: resolverName,
        resolvedAt: now,
      });

      // Update any active assignments for this report
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_reportId", (q) => q.eq("reportId", r._id))
        .collect();

      for (const a of assignments) {
        await ctx.db.patch(a._id, { status: "Completed" });
      }

      // Notify report owner
      if (r.userId) {
        await ctx.db.insert("notifications", {
          userId: r.userId,
          type: "resolved",
          title: "Report Resolved",
          message: `Your vector hazard report at ${r.locationName} has been cleared and resolved.`,
          reportId: r._id as string,
          read: false,
          createdAt: now,
        });
      }
    }

    return { success: true, resolvedCount: coLocatedReports.length };
  },
});

// Resolve all reports in a geographic location / cluster
export const resolveAreaReports = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    locationName: v.optional(v.string()),
    resolutionImage: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const resolverName = identity?.name || identity?.nickname || "Tanod Patrol Team";
    const now = Date.now();

    const allReports = await ctx.db.query("reports").collect();
    const matchingReports = allReports.filter((r) => {
      if (r.status?.toLowerCase() === "resolved" || r.status?.toLowerCase() === "completed") return false;

      const sameCoords =
        typeof r.lat === "number" &&
        Math.abs(r.lat - args.lat) < 0.0005 &&
        Math.abs(r.lng - args.lng) < 0.0005;

      const sameLocation =
        args.locationName &&
        r.locationName &&
        r.locationName.trim().toLowerCase() === args.locationName.trim().toLowerCase();

      return sameCoords || sameLocation;
    });

    for (const r of matchingReports) {
      await ctx.db.patch(r._id, {
        status: "Resolved",
        resolutionImage: args.resolutionImage || "",
        resolvedBy: resolverName,
        resolvedAt: now,
      });

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_reportId", (q) => q.eq("reportId", r._id))
        .collect();

      for (const a of assignments) {
        await ctx.db.patch(a._id, { status: "Completed" });
      }

      if (r.userId) {
        await ctx.db.insert("notifications", {
          userId: r.userId,
          type: "resolved",
          title: "Area Resolved",
          message: `Breeding site hazard at ${r.locationName} has been mitigated and resolved.`,
          reportId: r._id as string,
          read: false,
          createdAt: now,
        });
      }
    }

    return { success: true, resolvedCount: matchingReports.length };
  },
});
