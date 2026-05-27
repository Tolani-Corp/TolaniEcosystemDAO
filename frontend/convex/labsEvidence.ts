import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

const daoEvidenceStatus = v.union(
  v.literal("review"),
  v.literal("approved"),
  v.literal("proposed"),
  v.literal("executed"),
  v.literal("rejected")
);
const rewardAction = v.union(
  v.literal("none"),
  v.literal("task_bounty"),
  v.literal("training_reward"),
  v.literal("treasury_transfer"),
  v.literal("token_allocator")
);
const metricConfidence = v.union(
  v.literal("estimated"),
  v.literal("measured"),
  v.literal("verified")
);
const daoMetricCategory = v.union(
  v.literal("environmental"),
  v.literal("social"),
  v.literal("governance"),
  v.literal("training")
);
const rewardToken = v.union(v.literal("uTUT"), v.literal("TUT"));
const daoMetricReport = v.object({
  metricId: v.string(),
  label: v.string(),
  value: v.string(),
  unit: v.optional(v.string()),
  confidence: metricConfidence,
});
const daoRewardRecipient = v.object({
  wallet: v.optional(v.string()),
  role: v.string(),
  amountTut: v.number(),
  reason: v.string(),
});
const sourceDaoMetricReport = v.object({
  metricId: v.string(),
  value: v.union(v.number(), v.null()),
  unit: v.string(),
  category: daoMetricCategory,
});
const sourceDaoRewardRecipient = v.object({
  wallet: v.string(),
  role: v.string(),
  amount: v.number(),
  token: rewardToken,
});
const sourceDaoEvidencePacket = v.object({
  daoPacketId: v.string(),
  schema: v.literal("dao.esg-reward-evidence.v1"),
  labValidationId: v.string(),
  sourcePacketId: v.string(),
  projectId: v.string(),
  metricReports: v.array(sourceDaoMetricReport),
  evidenceHash: v.optional(v.union(v.string(), v.null())),
  evidenceUri: v.optional(v.union(v.string(), v.null())),
  rewardAction,
  rewardRecipients: v.array(sourceDaoRewardRecipient),
  proposalRequired: v.boolean(),
  proposalId: v.optional(v.union(v.string(), v.null())),
  status: daoEvidenceStatus,
});

const packetArgs = {
  sourcePacketId: v.string(),
  labValidationId: v.string(),
  projectId: v.string(),
  projectName: v.string(),
  sourceSystem: v.string(),
  proposalRequired: v.boolean(),
  proposalId: v.optional(v.string()),
  rewardAction,
  evidenceHash: v.optional(v.string()),
  evidenceUri: v.optional(v.string()),
  metricReports: v.array(daoMetricReport),
  rewardRecipients: v.array(daoRewardRecipient),
  packet: sourceDaoEvidencePacket,
};

export const list = query({
  args: {
    status: v.optional(daoEvidenceStatus),
    projectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const packets = args.status
      ? await ctx.db
          .query("daoEvidencePackets")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("daoEvidencePackets").collect();

    return packets
      .filter((packet) => !args.projectId || packet.projectId === args.projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getByLabValidationId = query({
  args: { labValidationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("daoEvidencePackets")
      .withIndex("by_lab_validation", (q) => q.eq("labValidationId", args.labValidationId))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("daoEvidencePackets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const submit = mutation({
  args: {
    ...packetArgs,
    handoffSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.DAO_EVIDENCE_HANDOFF_SECRET?.trim();
    if (expectedSecret && args.handoffSecret !== expectedSecret) {
      throw new Error("DAO evidence handoff is not authorized.");
    }

    const packet = {
      sourcePacketId: args.sourcePacketId,
      labValidationId: args.labValidationId,
      projectId: args.projectId,
      projectName: args.projectName,
      sourceSystem: args.sourceSystem,
      proposalRequired: args.proposalRequired,
      rewardAction: args.rewardAction,
      metricReports: args.metricReports,
      rewardRecipients: args.rewardRecipients,
      packet: args.packet,
      ...(args.proposalId ? { proposalId: args.proposalId } : {}),
      ...(args.evidenceHash ? { evidenceHash: args.evidenceHash } : {}),
      ...(args.evidenceUri ? { evidenceUri: args.evidenceUri } : {}),
    };
    const now = Date.now();
    const existing = await ctx.db
      .query("daoEvidencePackets")
      .withIndex("by_lab_validation", (q) => q.eq("labValidationId", packet.labValidationId))
      .first();

    const payload = {
      ...packet,
      status: "review" as const,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("daoEvidencePackets", {
      ...payload,
      createdAt: now,
    });
  },
});

export const review = mutation({
  args: {
    id: v.id("daoEvidencePackets"),
    status: daoEvidenceStatus,
    reviewerWallet: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    proposalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const packet = await ctx.db.get(args.id);
    if (!packet) throw new Error("DAO evidence packet not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      reviewerWallet: args.reviewerWallet,
      reviewNote: args.reviewNote,
      proposalId: args.proposalId ?? packet.proposalId,
      updatedAt: Date.now(),
    });
  },
});

function tsgSyncUrl() {
  return process.env.TSG_ECOSYSTEM_SYNC_URL?.trim() || process.env.TSG_PLATFORM_SYNC_URL?.trim() || "";
}

function tsgApiKey() {
  return (
    process.env.TSG_ECOSYSTEM_SYNC_KEY?.trim() ||
    process.env.TSG_PLATFORM_API_KEY?.trim() ||
    process.env.TSG_PLATFORM_API_KEYS?.split(/[,\s;]+/).find((value) => value.trim())?.trim() ||
    ""
  );
}

async function notifyTsgReview(
  packet: Doc<"daoEvidencePackets">,
  status: string,
  reviewerWallet?: string,
  reviewNote?: string
) {
  const url = tsgSyncUrl();
  if (!url) {
    return { sent: false, mode: "disabled" as const, message: "TSG_ECOSYSTEM_SYNC_URL is not configured." };
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  const apiKey = tsgApiKey();
  if (apiKey) headers["x-api-key"] = apiKey;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sourcePacketId: packet.sourcePacketId,
      labValidationId: packet.labValidationId,
      daoPacketId: packet.packet?.daoPacketId,
      projectId: packet.projectId,
      actor: "Tolani Ecosystem DAO",
      stage: status === "executed" ? "dao_execution" : "dao_review",
      status,
      summary: `DAO evidence packet ${status.replaceAll("_", " ")}.`,
      metadata: {
        reviewerWallet: reviewerWallet || null,
        reviewNote: reviewNote || null,
        proposalId: packet.proposalId || null,
        rewardAction: packet.rewardAction,
        proposalRequired: packet.proposalRequired,
      },
    }),
  });
  const body = await response.json().catch(() => null);

  return {
    sent: response.ok,
    mode: "http" as const,
    status: response.status,
    body,
  };
}

export const reviewAndNotifyTsg = action({
  args: {
    id: v.id("daoEvidencePackets"),
    status: daoEvidenceStatus,
    reviewerWallet: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    proposalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.labsEvidence.review, args);
    const packet = await ctx.runQuery(api.labsEvidence.getById, { id: args.id });
    if (!packet) throw new Error("DAO evidence packet not found after review.");

    let tsgSync: unknown;
    try {
      tsgSync = await notifyTsgReview(packet, args.status, args.reviewerWallet, args.reviewNote);
    } catch (error) {
      tsgSync = { sent: false, mode: "error", message: error instanceof Error ? error.message : String(error) };
    }

    return { ok: true, id: args.id, status: args.status, tsgSync };
  },
});
