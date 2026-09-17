import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const all = await ctx.db.query("notifications").order("desc").take(50);
    if (!identity) {
      return all;
    }

    return all.filter(
      (n) => n.userId === identity.subject || n.userId === "all" || !n.userId
    );
  },
});

export const getAllNotifications = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notifications").order("desc").take(50);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const all = await ctx.db.query("notifications").order("desc").take(50);
    const userNotifs = identity
      ? all.filter((n) => n.userId === identity.subject || n.userId === "all" || !n.userId)
      : all;

    return userNotifs.filter((n) => !n.read).length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("notifications").collect();
    for (const notif of all) {
      if (!notif.read) {
        await ctx.db.patch(notif._id, { read: true });
      }
    }
  },
});

export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    reportId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      reportId: args.reportId,
      read: false,
      createdAt: Date.now(),
    });
  },
});
