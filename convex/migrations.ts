import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateTeamBarangay = mutation({
  args: {
    teamId: v.id("teams"),
    barangay: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, { barangay: args.barangay });
  },
});

export const updateAllTeamBarangays = mutation({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    let updated = 0;
    
    for (const team of teams) {
      if (!team.barangay) {
        // Infer barangay from region or use default
        let barangay = "San Juan";
        if (team.region?.includes("Calumpang")) barangay = "Calumpang";
        else if (team.region?.includes("South Fundidor")) barangay = "South Fundidor";
        
        await ctx.db.patch(team._id, { barangay });
        updated++;
      }
    }
    
    return { updated };
  },
});