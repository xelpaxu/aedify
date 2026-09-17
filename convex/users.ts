import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export type Role = 
  | "citizen" 
  | "tanod" 
  | "lgu-admin"
  | "brgy-calumpang"
  | "brgy-sanjuan"
  | "brgy-southfundidor"
  | "sys-admin";

// ─── GET CURRENT USER ──────────────────────────────────────────────────────────

export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) return null;

    return user;
  },
});

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────

export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    barangay: v.string(),
    role: v.string(),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const userData = {
      clerkUserId: identity.subject,
      email: identity.email || "",
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: `${args.firstName} ${args.lastName}`,
      phone: args.phone,
      barangay: args.barangay,
      role: args.role as Role,
      teamId: args.teamId,
      profileComplete: true,
      updatedAt: Date.now(),
    };

    if (user) {
      // Update existing user
      await ctx.db.patch(user._id, userData);
      return user._id;
    } else {
      // Create new user
      const id = await ctx.db.insert("users", {
        ...userData,
        createdAt: Date.now(),
        tokenIdentifier: `clerk_${identity.subject}`,
      });
      return id;
    }
  },
});

// ─── GET TEAMS BY BARANGAY ────────────────────────────────────────────────────

export const getTeamsByBarangay = query({
  args: { barangay: v.string() },
  handler: async (ctx, args) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_barangay", (q) => q.eq("barangay", args.barangay))
      .collect();

    return teams;
  },
});

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
      ...user,
      profileImageUrl: user.profileImageId
        ? await ctx.storage.getUrl(user.profileImageId)
        : null,
    };
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const updateFirebaseProfile = mutation({
  args: {
    uid: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    location: v.string(),
    barangay: v.string(),
    profileImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_uid", (q) => q.eq("uid", args.uid))
      .unique();

    const fullName = `${args.firstName.trim()} ${args.lastName.trim()}`.trim();
    const profile = {
      uid: args.uid,
      email: args.email,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      fullName,
      name: fullName,
      displayName: fullName,
      phone: args.phone.trim(),
      location: args.location.trim(),
      barangay: args.barangay,
      profileComplete: true,
      updatedAt: Date.now(),
      ...(args.profileImageId ? { profileImageId: args.profileImageId } : {}),
    };

    if (existing) {
      const oldImageId = existing.profileImageId;
      await ctx.db.patch(existing._id, profile);
      if (args.profileImageId && oldImageId && oldImageId !== args.profileImageId) {
        await ctx.storage.delete(oldImageId);
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      ...profile,
      role: "lgu-admin",
      tokenIdentifier: `firebase_${args.uid}`,
      createdAt: Date.now(),
    });
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
