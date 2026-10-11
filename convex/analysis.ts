import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

export const processAndSaveReport = action({
  args: {
    image: v.string(),
    description: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationName: v.string(),
  },

  handler: async (ctx, args): Promise<Id<"reports">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // =========================
    // Convert Base64 -> Blob
    // =========================
    const base64Data = args.image.replace(/^data:image\/\w+;base64,/, "");

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    const imageBlob = new Blob([bytes], { type: "image/jpeg" });

    formData.append("file", imageBlob, "image.jpg");
    formData.append("description", args.description);

    // =========================
    // CALL PYTHON BACKEND
    // =========================
    const response = await fetch(
      "https://automatically-unbefriended-misty.ngrok-free.dev/detect",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`AI Server Error: ${response.status}`);
    }

    const result = await response.json();

    const riskLevel =
      result.risk_level ??
      (result.risk_score > 75
        ? "CRITICAL"
        : result.risk_score > 50
          ? "HIGH RISK"
          : "LOW RISK");
    const riskScore = result.risk_score ?? 0;

    console.log("Risk Level:", riskLevel);
    console.log("Risk Score:", riskScore);

    // ===============================================
    // STORE IMAGES IN CONVEX FILE STORAGE
    // (Prevents exceeding Convex 1MB document limit)
    // ===============================================
    let finalImageUrl = args.image;
    try {
      const storageId = await ctx.storage.store(imageBlob);
      const url = await ctx.storage.getUrl(storageId);
      if (url) finalImageUrl = url;
    } catch (e) {
      console.warn("Could not save original image to Convex storage:", e);
    }

    let finalProcessedUrl = result.processed_image || "";
    if (result.processed_image) {
      try {
        const procBase64 = result.processed_image.replace(/^data:image\/\w+;base64,/, "");
        const procBinary = atob(procBase64);
        const procBytes = new Uint8Array(procBinary.length);
        for (let i = 0; i < procBinary.length; i++) {
          procBytes[i] = procBinary.charCodeAt(i);
        }
        const procBlob = new Blob([procBytes], { type: "image/jpeg" });
        const procStorageId = await ctx.storage.store(procBlob);
        const url = await ctx.storage.getUrl(procStorageId);
        if (url) finalProcessedUrl = url;
      } catch (e) {
        console.warn("Could not save processed image to Convex storage:", e);
      }
    }

    // =========================
    // SAVE TO DATABASE
    // =========================
    // Get the user from the database to get their barangay
    const user = await ctx.runQuery(api.users.getMe);

    const reportId = await ctx.runMutation(api.reports.createReport, {
      userId: identity.subject,
      userName: identity.name || "Anonymous",
      description: args.description,
      imageUri: finalImageUrl,
      processedImage: finalProcessedUrl,
      reasoning: result.reasoning || "Analysis complete.",
      accuracy: `${result.risk_score ?? 0}%`,
      verified: false,
      detections: result.detections || [],
      locationName: args.locationName,
      lat: args.lat,
      lng: args.lng,
      status: riskLevel,
      riskLevel: riskLevel,
      timestamp: typeof result.timestamp === "number" ? result.timestamp : Date.now(),
      clerkUserId: identity.subject,
      barangay: user?.barangay,
      public: false,
    });

    return reportId;
  },
});