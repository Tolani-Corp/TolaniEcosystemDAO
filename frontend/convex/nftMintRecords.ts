import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const nftRecordType = v.union(
  v.literal("training_certificate"),
  v.literal("work_order"),
  v.literal("work_deliverable"),
  v.literal("dao_evidence"),
  v.literal("steward_badge")
);
const nftTokenStandard = v.union(v.literal("ERC721"), v.literal("ERC1155"));
const nftTransferability = v.union(
  v.literal("soulbound"),
  v.literal("restricted"),
  v.literal("transferable")
);
const nftMintStatus = v.union(
  v.literal("draft"),
  v.literal("eligible"),
  v.literal("approved"),
  v.literal("mint_queued"),
  v.literal("minted"),
  v.literal("revoked"),
  v.literal("superseded"),
  v.literal("rejected")
);

const recordArgs = {
  sourceType: nftRecordType,
  sourceId: v.string(),
  sourceOfTruthId: v.string(),
  policyId: v.string(),
  policyVersion: v.string(),
  recordTitle: v.string(),
  tokenStandard: nftTokenStandard,
  transferability: nftTransferability,
  chainId: v.number(),
  contractAddress: v.optional(v.string()),
  tokenId: v.optional(v.string()),
  txHash: v.optional(v.string()),
  metadataUri: v.optional(v.string()),
  metadataHash: v.optional(v.string()),
  evidenceUri: v.optional(v.string()),
  evidenceHash: v.optional(v.string()),
  recipientWallet: v.optional(v.string()),
  issuerWallet: v.optional(v.string()),
  reviewerWallet: v.optional(v.string()),
  proposalId: v.optional(v.string()),
  notes: v.optional(v.string()),
  policySnapshotJson: v.optional(v.string()),
};

export const list = query({
  args: {
    status: v.optional(nftMintStatus),
    policyId: v.optional(v.string()),
    sourceType: v.optional(nftRecordType),
    recipientWallet: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = args.status
      ? await ctx.db
          .query("nftMintRecords")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : args.policyId
        ? await ctx.db
            .query("nftMintRecords")
            .withIndex("by_policy", (q) => q.eq("policyId", args.policyId!))
            .collect()
        : args.recipientWallet
          ? await ctx.db
              .query("nftMintRecords")
              .withIndex("by_recipient", (q) => q.eq("recipientWallet", args.recipientWallet!))
              .collect()
          : await ctx.db.query("nftMintRecords").collect();

    return records
      .filter((record) => !args.sourceType || record.sourceType === args.sourceType)
      .filter((record) => !args.policyId || record.policyId === args.policyId)
      .filter((record) => !args.recipientWallet || record.recipientWallet === args.recipientWallet)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getBySourceOfTruthId = query({
  args: { sourceOfTruthId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nftMintRecords")
      .withIndex("by_source_of_truth", (q) => q.eq("sourceOfTruthId", args.sourceOfTruthId))
      .first();
  },
});

export const getBySource = query({
  args: {
    sourceType: nftRecordType,
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nftMintRecords")
      .withIndex("by_source", (q) => q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    ...recordArgs,
    status: v.optional(nftMintStatus),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("nftMintRecords")
      .withIndex("by_source_of_truth", (q) => q.eq("sourceOfTruthId", args.sourceOfTruthId))
      .first();

    const payload = {
      schema: "dao.dynamic-nft-record.v1" as const,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceOfTruthId: args.sourceOfTruthId,
      policyId: args.policyId,
      policyVersion: args.policyVersion,
      recordTitle: args.recordTitle,
      status: args.status ?? existing?.status ?? ("draft" as const),
      tokenStandard: args.tokenStandard,
      transferability: args.transferability,
      chainId: args.chainId,
      ...(args.contractAddress ? { contractAddress: args.contractAddress } : {}),
      ...(args.tokenId ? { tokenId: args.tokenId } : {}),
      ...(args.txHash ? { txHash: args.txHash } : {}),
      ...(args.metadataUri ? { metadataUri: args.metadataUri } : {}),
      ...(args.metadataHash ? { metadataHash: args.metadataHash } : {}),
      ...(args.evidenceUri ? { evidenceUri: args.evidenceUri } : {}),
      ...(args.evidenceHash ? { evidenceHash: args.evidenceHash } : {}),
      ...(args.recipientWallet ? { recipientWallet: args.recipientWallet } : {}),
      ...(args.issuerWallet ? { issuerWallet: args.issuerWallet } : {}),
      ...(args.reviewerWallet ? { reviewerWallet: args.reviewerWallet } : {}),
      ...(args.proposalId ? { proposalId: args.proposalId } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
      ...(args.policySnapshotJson ? { policySnapshotJson: args.policySnapshotJson } : {}),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("nftMintRecords", {
      ...payload,
      createdAt: now,
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("nftMintRecords"),
    status: nftMintStatus,
    reviewerWallet: v.optional(v.string()),
    contractAddress: v.optional(v.string()),
    tokenId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    metadataUri: v.optional(v.string()),
    metadataHash: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("NFT mint record not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.reviewerWallet ? { reviewerWallet: args.reviewerWallet } : {}),
      ...(args.contractAddress ? { contractAddress: args.contractAddress } : {}),
      ...(args.tokenId ? { tokenId: args.tokenId } : {}),
      ...(args.txHash ? { txHash: args.txHash } : {}),
      ...(args.metadataUri ? { metadataUri: args.metadataUri } : {}),
      ...(args.metadataHash ? { metadataHash: args.metadataHash } : {}),
      ...(args.notes ? { notes: args.notes } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const revoke = mutation({
  args: {
    id: v.id("nftMintRecords"),
    revocationReason: v.string(),
    reviewerWallet: v.optional(v.string()),
    supersededBySourceOfTruthId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("NFT mint record not found");

    await ctx.db.patch(args.id, {
      status: args.supersededBySourceOfTruthId ? "superseded" : "revoked",
      revocationReason: args.revocationReason,
      ...(args.reviewerWallet ? { reviewerWallet: args.reviewerWallet } : {}),
      ...(args.supersededBySourceOfTruthId
        ? { supersededBySourceOfTruthId: args.supersededBySourceOfTruthId }
        : {}),
      updatedAt: Date.now(),
    });
  },
});
