import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

type SeedWorkItem = {
  publicId: string;
  title: string;
  type: "Open Job" | "DAO Task";
  status: "intake" | "estimating" | "ready" | "active" | "submitted" | "review";
  trade: string;
  location: string;
  owner: string;
  budgetUsd: number;
  rewardTut: number;
  due: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  crew: string;
  certification: string;
  risk: string;
  progress: number;
  scope: string;
  deliverables: string[];
  dependencies: string[];
  daoRequired: boolean;
  flagged: boolean;
};

const createArgs = {
  title: v.string(),
  type: workType,
  status: v.optional(workStatus),
  trade: v.string(),
  location: v.string(),
  owner: v.optional(v.string()),
  budgetUsd: v.number(),
  rewardTut: v.number(),
  due: v.optional(v.string()),
  priority,
  crew: v.optional(v.string()),
  certification: v.optional(v.string()),
  risk: v.optional(v.string()),
  progress: v.optional(v.number()),
  scope: v.optional(v.string()),
  deliverables: v.optional(v.array(v.string())),
  dependencies: v.optional(v.array(v.string())),
  daoRequired: v.optional(v.boolean()),
  flagged: v.optional(v.boolean()),
  createdByWallet: v.optional(v.string()),
};

const seedItems: SeedWorkItem[] = [
  {
    publicId: "JOB-1042",
    title: "Mixed-use tenant improvement BIM coordination",
    type: "Open Job",
    status: "ready",
    trade: "BIM/VDC",
    location: "Atlanta, GA",
    owner: "Tolani Construction Studio",
    budgetUsd: 18500,
    rewardTut: 3200,
    due: "Jun 7, 2026",
    priority: "High",
    crew: "1 BIM lead, 2 Revit modelers",
    certification: "Revit Professional or BIM coordination portfolio",
    risk: "MEP clash density and late owner design updates",
    progress: 62,
    scope:
      "Coordinate architectural, structural, and MEP models for a fast-turn tenant improvement package.",
    deliverables: ["Federated Revit model", "Navisworks clash report", "Sheet issue tracker"],
    dependencies: ["Owner background set", "MEP engineer model export", "Shared coordinate confirmation"],
    daoRequired: false,
    flagged: false,
  },
  {
    publicId: "DAO-220",
    title: "Approve training reward policy for BIM credential tasks",
    type: "DAO Task",
    status: "review",
    trade: "BIM/VDC",
    location: "DAO",
    owner: "Tolani DAO",
    budgetUsd: 0,
    rewardTut: 1250,
    due: "May 30, 2026",
    priority: "Critical",
    crew: "Governance reviewer, training admin",
    certification: "DAO reviewer access",
    risk: "Reward permissions must match TUT treasury controls",
    progress: 84,
    scope:
      "Finalize the policy mapping professional proof-of-completion into claimable TUT training rewards.",
    deliverables: ["Reward policy memo", "Admin role matrix", "Governor proposal draft"],
    dependencies: ["Training contract address", "Tolani Labs completion evidence schema"],
    daoRequired: true,
    flagged: true,
  },
];

function makePublicId(type: "Open Job" | "DAO Task", now: number) {
  const prefix = type === "Open Job" ? "JOB" : "DAO";
  return `${prefix}-${String(now).slice(-6)}`;
}

function statusProgress(status: string, current: number) {
  if (status === "review") return Math.max(current, 88);
  if (status === "submitted") return Math.max(current, 76);
  if (status === "active") return Math.max(current, 45);
  if (status === "ready") return Math.max(current, 35);
  if (status === "estimating") return Math.max(current, 20);
  return Math.max(current, 8);
}

export const list = query({
  args: {
    query: v.optional(v.string()),
    trade: v.optional(v.string()),
    type: v.optional(workType),
    status: v.optional(workStatus),
    priority: v.optional(priority),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("constructionWorkItems").collect();
    const normalizedQuery = args.query?.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            item.publicId,
            item.title,
            item.scope,
            item.trade,
            item.location,
            item.owner,
            item.certification,
            ...item.deliverables,
            ...item.dependencies,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesTrade = !args.trade || args.trade === "All trades" || item.trade === args.trade;
        const matchesType = !args.type || item.type === args.type;
        const matchesStatus = !args.status || item.status === args.status;
        const matchesPriority = !args.priority || item.priority === args.priority;

        return matchesQuery && matchesTrade && matchesType && matchesStatus && matchesPriority;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: createArgs,
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("constructionWorkItems", {
      publicId: makePublicId(args.type, now),
      title: args.title,
      type: args.type,
      status: args.status ?? "intake",
      trade: args.trade,
      location: args.location,
      owner: args.owner ?? (args.type === "DAO Task" ? "Tolani DAO" : "Open construction partner"),
      budgetUsd: args.budgetUsd,
      rewardTut: args.rewardTut,
      due: args.due ?? "Triage needed",
      priority: args.priority,
      crew: args.crew ?? "Needs assignment",
      certification: args.certification ?? "To be verified during intake",
      risk: args.risk ?? "Scope, schedule, and approval path need confirmation",
      progress: args.progress ?? 8,
      scope: args.scope ?? "New work request created from the construction platform intake form.",
      deliverables: args.deliverables ?? ["Scope confirmation", "Owner approval path", "Reward estimate"],
      dependencies: args.dependencies ?? ["Task owner", "Budget approval", "Required credentials"],
      daoRequired: args.daoRequired ?? args.type === "DAO Task",
      flagged: args.flagged ?? false,
      createdAt: now,
      updatedAt: now,
      createdByWallet: args.createdByWallet,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("constructionWorkItems"),
    status: workStatus,
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Work item not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      progress: statusProgress(args.status, item.progress),
      updatedAt: Date.now(),
    });
  },
});

export const claim = mutation({
  args: {
    id: v.id("constructionWorkItems"),
    wallet: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Work item not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "active",
      claimedByWallet: args.wallet,
      progress: statusProgress("active", item.progress),
      updatedAt: now,
    });

    if (args.wallet) {
      await ctx.db.insert("workClaims", {
        workItemId: args.id,
        wallet: args.wallet,
        note: args.note,
        createdAt: now,
      });
    }
  },
});

export const toggleFlag = mutation({
  args: {
    id: v.id("constructionWorkItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Work item not found");

    await ctx.db.patch(args.id, {
      flagged: !item.flagged,
      updatedAt: Date.now(),
    });
  },
});

export const requestReview = mutation({
  args: {
    id: v.id("constructionWorkItems"),
    reviewerWallet: v.optional(v.string()),
    rewardAction: v.union(
      v.literal("none"),
      v.literal("task_bounty"),
      v.literal("training_reward"),
      v.literal("treasury_transfer"),
      v.literal("token_allocator")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Work item not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "review",
      progress: statusProgress("review", item.progress),
      updatedAt: now,
    });

    return await ctx.db.insert("workReviews", {
      workItemId: args.id,
      reviewerWallet: args.reviewerWallet,
      decision: "pending",
      note: args.note,
      rewardAction: args.rewardAction,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("constructionWorkItems").take(1);
    if (existing.length > 0) return { inserted: 0 };

    const now = Date.now();
    const ids: Array<Id<"constructionWorkItems">> = [];
    for (const item of seedItems) {
      ids.push(
        await ctx.db.insert("constructionWorkItems", {
          ...item,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    return { inserted: ids.length };
  },
});
