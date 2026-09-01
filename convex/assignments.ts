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
    await ctx.db.patch(args.assignmentId, { status: args.status });

    // Create notification for status change
    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment) {
      const report = await ctx.db.get(assignment.reportId);
      const team = await ctx.db.get(assignment.teamId);
      if (report && team) {
        // Notify report owner
        if (report.userId) {
          await ctx.db.insert("notifications", {
            userId: report.userId,
            type: "status_change",
            title: `Report ${args.status}`,
            message: `Your report at ${report.locationName} has been marked as ${args.status} by ${team.name}.`,
            reportId: assignment.reportId as string,
            read: false,
            createdAt: Date.now(),
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
    if (!identity) throw new Error("Not authenticated");

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    // Update assignment status
    await ctx.db.patch(args.assignmentId, { status: "Completed" });

    // Update report with resolution data
    const report = await ctx.db.get(assignment.reportId);
    if (report) {
      await ctx.db.patch(assignment.reportId, {
        status: "Resolved",
        resolutionImage: args.resolutionImage,
        resolvedBy: identity.subject,
        resolvedAt: Date.now(),
      });

      // Notify report owner
      if (report.userId) {
        await ctx.db.insert("notifications", {
          userId: report.userId,
          type: "resolved",
          title: "Report Resolved",
          message: `Your report at ${report.locationName} has been resolved.`,
          reportId: assignment.reportId as string,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});