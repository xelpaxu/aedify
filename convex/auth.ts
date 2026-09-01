import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export type Role =
  | "lgu-admin"
  | "brgy-calumpang"
  | "brgy-sanjuan"
  | "brgy-southfundidor"
  | "sys-admin";

// ─── GET USER BY UID ──────────────────────────────────────────────────────────

export const getUserByUid = query({
  args: { uid: v.string() },
  handler: async (ctx, { uid }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_uid")
      .filter((q) => q.eq(q.field("uid"), uid))
      .first();

    if (!user) return null;

    return {
      id: user._id,
      uid: user.uid || "",
      username: user.username || "",
      email: user.email || "",
      role: user.role as Role || "lgu-admin",
      displayName: user.displayName || "",
      location: user.location || "Not specified",
    };
  },
});

// ─── LOGIN WITH FIREBASE ──────────────────────────────────────────────────────

export const loginWithFirebase = mutation({
  args: {
    uid: v.string(),
    email: v.string(),
    username: v.string(),
    displayName: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_uid")
      .filter((q) => q.eq(q.field("uid"), args.uid))
      .first();

    if (existing) {
      // Update existing user
      return {
        id: existing._id,
        uid: existing.uid || "",
        username: existing.username || "",
        email: existing.email || "",
        role: existing.role as Role || "lgu-admin",
        displayName: existing.displayName || "",
        location: existing.location || "Not specified",
      };
    }

    // Create new user
    const id = await ctx.db.insert("users", {
      uid: args.uid,
      username: args.username,
      email: args.email,
      role: args.role as Role,
      displayName: args.displayName,
      location: "Not specified",
      createdAt: Date.now(),
      tokenIdentifier: `firebase_${args.uid}`,
      name: args.displayName,
    });

    return {
      id,
      uid: args.uid,
      username: args.username,
      email: args.email,
      role: args.role as Role,
      displayName: args.displayName,
      location: "Not specified",
    };
  },
});

// ─── LIST ACCOUNTS ────────────────────────────────────────────────────────────

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      id: user._id,
      uid: user.uid || "",
      username: user.username || "",
      email: user.email || "",
      role: (user.role as Role) || "lgu-admin",
      displayName: user.displayName || "",
      location: user.location || "Not specified",
    }));
  },
});

// ─── CREATE ADMIN (for seeding) ──────────────────────────────────────────────

export const createAdmin = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.string(),
    displayName: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existing) {
      throw new Error(`User with email ${args.email} already exists`);
    }

    // Create user
    const id = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      role: args.role as Role,
      displayName: args.displayName,
      location: args.location,
      createdAt: Date.now(),
      tokenIdentifier: `admin_${args.username}`,
      name: args.displayName,
      // Note: Password is stored in Firebase, not here
    });

    return {
      id,
      username: args.username,
      email: args.email,
      role: args.role as Role,
      displayName: args.displayName,
      location: args.location,
    };
  },
});