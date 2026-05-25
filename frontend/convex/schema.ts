import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const workType = v.union(v.literal("Open Job"), v.literal("DAO Task"));
const workStatus = v.union(
  v.literal("intake"),
  v.literal("estimating"),
  v.literal("ready"),
  v.literal("active"),
  v.literal("submitted"),
  v.literal("review")
);
const priority = v.union(
  v.literal("Low"),
  v.literal("Medium"),
  v.literal("High"),
  v.literal("Critical")
);
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

export default defineSchema({
  constructionWorkItems: defineTable({
    publicId: v.string(),
    title: v.string(),
    type: workType,
    status: workStatus,
    trade: v.string(),
    location: v.string(),
    owner: v.string(),
    budgetUsd: v.number(),
    rewardTut: v.number(),
    due: v.string(),
    priority,
    crew: v.string(),
    certification: v.string(),
    risk: v.string(),
    progress: v.number(),
    scope: v.string(),
    deliverables: v.array(v.string()),
    dependencies: v.array(v.string()),
    daoRequired: v.boolean(),
    flagged: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByWallet: v.optional(v.string()),
    claimedByWallet: v.optional(v.string()),
  })
    .index("by_public_id", ["publicId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_trade", ["trade"])
    .index("by_priority", ["priority"]),

  workClaims: defineTable({
    workItemId: v.id("constructionWorkItems"),
    wallet: v.string(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_work_item", ["workItemId"]),

  workDeliverables: defineTable({
    workItemId: v.id("constructionWorkItems"),
    title: v.string(),
    url: v.optional(v.string()),
    status: v.union(
      v.literal("requested"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    submittedByWallet: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_work_item", ["workItemId"]),

  workReviews: defineTable({
    workItemId: v.id("constructionWorkItems"),
    reviewerWallet: v.optional(v.string()),
    decision: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("changes_requested"),
      v.literal("rejected")
    ),
    note: v.optional(v.string()),
    rewardAction,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_work_item", ["workItemId"]),

  daoEvidencePackets: defineTable({
    sourcePacketId: v.string(),
    labValidationId: v.string(),
    projectId: v.string(),
    projectName: v.string(),
    sourceSystem: v.string(),
    status: daoEvidenceStatus,
    proposalRequired: v.boolean(),
    proposalId: v.optional(v.string()),
    rewardAction,
    evidenceHash: v.optional(v.string()),
    evidenceUri: v.optional(v.string()),
    metricReports: v.array(daoMetricReport),
    rewardRecipients: v.array(daoRewardRecipient),
    packet: sourceDaoEvidencePacket,
    reviewerWallet: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lab_validation", ["labValidationId"])
    .index("by_source_packet", ["sourcePacketId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),
});
