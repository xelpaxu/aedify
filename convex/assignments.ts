import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createAssignment = mutation({
  args: { reportId: v.id("reports"), teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignments", {
      reportId: args.reportId,
      teamId: args.teamId,
      status: "Assigned",
      assignedAt: Date.now(),
    });
  },
});

export const addTeam = mutation({
  args: {
    name: v.string(),
    barangay: v.optional(v.string()), // ← CHANGED: made optional
    region: v.string(),
    avatar: v.string(),
    leaderId: v.optional(v.string()),
    memberIds: v.optional(v.array(v.string())),
    memberNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", { ...args });
  },
});

export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    barangay: v.optional(v.string()),
    region: v.optional(v.string()),
    avatar: v.optional(v.string()),
    leaderId: v.optional(v.string()),
    memberIds: v.optional(v.array(v.string())),
    memberNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { teamId, ...updates } = args;
    await ctx.db.patch(teamId, updates);
  },
});

export const getAllTeams = query({
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

export const getTeamById = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

export const getActiveAssignments = query({
  handler: async (ctx) => {
    const assignments = await ctx.db.query("assignments").collect();

    return await Promise.all(
      assignments.map(async (task) => {
        const team = await ctx.db.get(task.teamId);
        const report = await ctx.db.get(task.reportId);

        return {
          ...task,
          teamName: team?.name || "Unknown Team",
          teamAvatar: team?.avatar || "",
          region: team?.region || "Unknown Region",
          location: report?.locationName || "Unknown Location",
          reportStatus: report?.status || "PENDING",
          reportDescription: report?.description || "",
        };
      }),
    );
  },
});

export const getAssignmentById = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return null;

    const team = await ctx.db.get(assignment.teamId);
    const report = await ctx.db.get(assignment.reportId);

    return {
      ...assignment,
      teamName: team?.name || "Unknown Team",
      teamAvatar: team?.avatar || "",
      region: team?.region || "Unknown Region",
      leaderId: team?.leaderId || "",
      memberIds: team?.memberIds || [],
      memberNames: team?.memberNames || [],
      location: report?.locationName || "Unknown Location",
      locationLat: report?.lat || 0,
      locationLng: report?.lng || 0,
      reportStatus: report?.status || "PENDING",
      reportDescription: report?.description || "",
      reportImage: report?.imageUri || "",
      reportReasoning: report?.reasoning || "",
      reportAccuracy: report?.accuracy || "",
      userName: report?.userName || "Unknown",
    };
  },
});

export const updateAssignmentStatus = mutation({
  args: {
    assignmentId: v.id("assignments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.assignmentId, { status: args.status });

    const isCompleted = args.status.toLowerCase() === "completed" || args.status.toLowerCase() === "resolved";

    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment) {
      const report = await ctx.db.get(assignment.reportId);
      const team = await ctx.db.get(assignment.teamId);

      if (report && isCompleted) {
        // Find and resolve all co-located reports at this area
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

        for (const r of coLocatedReports) {
          await ctx.db.patch(r._id, {
            status: "Resolved",
            resolvedBy: team?.name || "Tanod Team",
            resolvedAt: now,
          });

          // Mark other assignments for this co-located report as completed
          const otherAssignments = await ctx.db
            .query("assignments")
            .withIndex("by_reportId", (q) => q.eq("reportId", r._id))
            .collect();

          for (const a of otherAssignments) {
            await ctx.db.patch(a._id, { status: "Completed" });
          }

          if (r.userId) {
            await ctx.db.insert("notifications", {
              userId: r.userId,
              type: "resolved",
              title: "Report Resolved",
              message: `Your report at ${r.locationName} has been resolved by ${team?.name || "Tanod team"}.`,
              reportId: r._id as string,
              read: false,
              createdAt: now,
            });
          }
        }
      } else if (report && team) {
        if (report.userId) {
          await ctx.db.insert("notifications", {
            userId: report.userId,
            type: "status_change",
            title: `Report ${args.status}`,
            message: `Your report at ${report.locationName} has been marked as ${args.status} by ${team.name}.`,
            reportId: assignment.reportId as string,
            read: false,
            createdAt: now,
          });
        }
      }
    }
  },
});

/* ─────────────────────────────────────
   TANOD: Get assignments for a team
───────────────────────────────────── */

export const getAssignmentsForTanod = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get user to find their teamId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user?.teamId) return [];

    // Get the team - assert the type
    const team = await ctx.db.get(user.teamId as Id<"teams">);
    if (!team) return [];

    // Type guard to ensure we have a teams document
    if (!("name" in team && "avatar" in team && "region" in team)) {
      return [];
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_teamId", (q) => q.eq("teamId", user.teamId as Id<"teams">))
      .collect();

    return await Promise.all(
      assignments.map(async (task) => {
        const report = await ctx.db.get(task.reportId);
        return {
          ...task,
          teamName: team.name,
          teamAvatar: team.avatar,
          region: team.region,
          location: report?.locationName || "Unknown Location",
          lat: report?.lat || 0,
          lng: report?.lng || 0,
          reportStatus: report?.status || "PENDING",
          reportDescription: report?.description || "",
          reportImage: report?.imageUri || "",
          reportProcessedImage: report?.processedImage || "",
          userName: report?.userName || "Unknown",
        };
      }),
    );
  },
});

/* ─────────────────────────────────────
   TANOD: Resolve assignment with image
───────────────────────────────────── */

export const resolveAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    resolutionImage: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const resolverId = identity?.subject || "tanod-unit";

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const now = Date.now();
    await ctx.db.patch(args.assignmentId, { status: "Completed" });

    const report = await ctx.db.get(assignment.reportId);
    if (report) {
      // Find all co-located reports and resolve them
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

      for (const r of coLocatedReports) {
        await ctx.db.patch(r._id, {
          status: "Resolved",
          resolutionImage: args.resolutionImage,
          resolvedBy: resolverId,
          resolvedAt: now,
        });

        const relatedAssignments = await ctx.db
          .query("assignments")
          .withIndex("by_reportId", (q) => q.eq("reportId", r._id))
          .collect();

        for (const a of relatedAssignments) {
          await ctx.db.patch(a._id, { status: "Completed" });
        }

        if (r.userId) {
          await ctx.db.insert("notifications", {
            userId: r.userId,
            type: "resolved",
            title: "Report Resolved",
            message: `Your report at ${r.locationName} has been resolved by field patrol.`,
            reportId: r._id as string,
            read: false,
            createdAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});