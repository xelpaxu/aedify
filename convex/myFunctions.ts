import { query } from "./_generated/server";

export const whoAmI = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity ? identity.name : "Stanger";
  },
});
