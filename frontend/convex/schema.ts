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
    rewardAction: v.union(
      v.literal("none"),
      v.literal("task_bounty"),
      v.literal("training_reward"),
      v.literal("treasury_transfer"),
      v.literal("token_allocator")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_work_item", ["workItemId"]),
});
