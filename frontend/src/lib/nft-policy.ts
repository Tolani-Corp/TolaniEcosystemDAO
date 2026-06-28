export type NftRecordType =
  | "training_certificate"
  | "work_order"
  | "work_deliverable"
  | "dao_evidence"
  | "steward_badge";

export type NftTokenStandard = "ERC721" | "ERC1155" | "ERC5192";
export type NftTransferability = "soulbound" | "restricted" | "transferable";
export type NftPrivacyLevel = "public" | "limited" | "private_reference";
export type NftStorageTarget = "R2" | "IPFS" | "D1" | "Convex";

export type NftMintStatus =
  | "draft"
  | "eligible"
  | "approved"
  | "mint_queued"
  | "minted"
  | "revoked"
  | "superseded"
  | "rejected";

export interface NftEvidenceRequirement {
  id: string;
  label: string;
  source: string;
  required: boolean;
  privacy: NftPrivacyLevel;
}

export interface NftMetadataField {
  key: string;
  label: string;
  required: boolean;
  privacy: NftPrivacyLevel;
}

export interface NftDynamicPolicy {
  id: string;
  schema: "dao.dynamic-nft-policy.v1";
  version: string;
  name: string;
  shortName: string;
  recordType: NftRecordType;
  sourceOfTruthPrefix: string;
  summary: string;
  tokenStandard: NftTokenStandard;
  transferability: NftTransferability;
  defaultChainId: number;
  contractScope: string;
  issuerRoles: string[];
  approverRoles: string[];
  revocationRoles: string[];
  mintTriggers: string[];
  requiredEvidence: NftEvidenceRequirement[];
  requiredMetadata: NftMetadataField[];
  metadataStorage: NftStorageTarget[];
  evidenceStorage: NftStorageTarget[];
  privacyLevel: NftPrivacyLevel;
  retention: string;
  riskControls: string[];
  statusFlow: NftMintStatus[];
  onChainFields: string[];
  offChainFields: string[];
  proposalRequired: boolean;
  active: boolean;
}

export type NftMintRailGateId =
  | "policy"
  | "source_of_truth"
  | "authority"
  | "storage"
  | "duplicate_prevention"
  | "contract"
  | "metadata"
  | "recipient";

export interface NftMintRailGate {
  id: NftMintRailGateId;
  label: string;
  description: string;
  requiredBefore: NftMintStatus;
}

export interface NftMintRailReadinessInput {
  policyId: string;
  sourceOfTruthId?: string;
  recipientWallet?: string;
  contractAddress?: string;
  metadataHash?: string;
  evidenceHash?: string;
  issuerRoleResolved?: boolean;
  approverRoleResolved?: boolean;
  metadataStorageReady?: boolean;
  evidenceStorageReady?: boolean;
  duplicateCheckReady?: boolean;
}

export interface NftMintRailReadiness {
  policy?: NftDynamicPolicy;
  gates: Array<NftMintRailGate & { passed: boolean; reason?: string }>;
  canApprove: boolean;
  canQueueMint: boolean;
  canMint: boolean;
  nextStatus: NftMintStatus;
  blockingReasons: string[];
}

export interface NftMetadataEnvelope {
  schema: "dao.dynamic-nft-metadata.v1";
  sourceOfTruthId: string;
  policyId: string;
  policyVersion: string;
  recordType: NftRecordType;
  name: string;
  description: string;
  issuer: string;
  recipientWallet?: string;
  issuedAt: string;
  source: {
    type: NftRecordType;
    id: string;
    system: string;
    uri?: string;
  };
  evidence: Array<{
    label: string;
    uri?: string;
    hash?: string;
    privacy: NftPrivacyLevel;
  }>;
  attributes: Array<{
    trait_type: string;
    value: string | number | boolean;
  }>;
  revocation: {
    status: "active" | "revoked" | "superseded";
    reason?: string;
    supersededBy?: string;
  };
}

export const NFT_POLICY_VERSION = "nft-policy.v1.0.0";

export const nftMintStatuses: Array<{
  status: NftMintStatus;
  label: string;
  description: string;
}> = [
  {
    status: "draft",
    label: "Draft",
    description: "Source record exists, but eligibility evidence is incomplete.",
  },
  {
    status: "eligible",
    label: "Eligible",
    description: "Required evidence is attached and ready for policy review.",
  },
  {
    status: "approved",
    label: "Approved",
    description: "Approver has confirmed the record can be queued for minting.",
  },
  {
    status: "mint_queued",
    label: "Mint queued",
    description: "Metadata is pinned and the transaction is ready to submit.",
  },
  {
    status: "minted",
    label: "Minted",
    description: "Token ID, contract, chain, and metadata URI are recorded.",
  },
  {
    status: "revoked",
    label: "Revoked",
    description: "Credential remains auditable, but is no longer valid.",
  },
  {
    status: "superseded",
    label: "Superseded",
    description: "A newer source-of-truth record replaces this token.",
  },
  {
    status: "rejected",
    label: "Rejected",
    description: "Review failed and minting is blocked until remediated.",
  },
];

const defaultFlow: NftMintStatus[] = [
  "draft",
  "eligible",
  "approved",
  "mint_queued",
  "minted",
  "revoked",
  "superseded",
];

export const nftMintRailHardGates: NftMintRailGate[] = [
  {
    id: "policy",
    label: "Active policy",
    description: "The source record must map to an active policy ID and version.",
    requiredBefore: "eligible",
  },
  {
    id: "source_of_truth",
    label: "Source-of-truth ID",
    description: "Every token must anchor to one durable source ID before approval.",
    requiredBefore: "eligible",
  },
  {
    id: "authority",
    label: "Issuer and approver authority",
    description: "Issuer and approver roles must be resolved before queueing any mint.",
    requiredBefore: "mint_queued",
  },
  {
    id: "storage",
    label: "Storage lock",
    description: "Metadata and evidence storage must be ready before queueing a mint.",
    requiredBefore: "mint_queued",
  },
  {
    id: "duplicate_prevention",
    label: "Duplicate prevention",
    description: "The rail must check source ID and evidence hash uniqueness before minting.",
    requiredBefore: "mint_queued",
  },
  {
    id: "contract",
    label: "Contract configured",
    description: "The contract address, chain, and mint function must be configured before mint execution.",
    requiredBefore: "minted",
  },
  {
    id: "metadata",
    label: "Metadata hash",
    description: "Public metadata must be hashed and pinned before mint execution.",
    requiredBefore: "minted",
  },
  {
    id: "recipient",
    label: "Recipient wallet",
    description: "Recipient-specific records need a confirmed wallet before mint execution.",
    requiredBefore: "minted",
  },
];

export const nftPolicyRegistry: NftDynamicPolicy[] = [
  {
    id: "tut.training-certificate.nft.v1",
    schema: "dao.dynamic-nft-policy.v1",
    version: "1.0.0",
    name: "Training Certificate NFT",
    shortName: "Training Cert",
    recordType: "training_certificate",
    sourceOfTruthPrefix: "TUT-CERT",
    summary:
      "Non-transferable credential for verified training completions and reward-eligible certifications.",
    tokenStandard: "ERC5192",
    transferability: "soulbound",
    defaultChainId: 8453,
    contractScope: "contracts/ecosystem/TolaniEcosystemNFT.sol with ERC-5192 locked transfer behavior.",
    issuerRoles: ["TrainingRewards.REWARDER_ROLE", "Training administrator"],
    approverRoles: ["Training reviewer", "DAO evidence reviewer"],
    revocationRoles: ["Training administrator", "DAO governance"],
    mintTriggers: [
      "Verified course or credential completion",
      "Reward policy match",
      "Recipient wallet confirmed",
    ],
    requiredEvidence: [
      {
        id: "completion-proof",
        label: "Completion proof",
        source: "Training provider, SkillsBuild, or verified issuer",
        required: true,
        privacy: "limited",
      },
      {
        id: "review-record",
        label: "Reviewer approval",
        source: "TrainingRewards review or DAO evidence packet",
        required: true,
        privacy: "public",
      },
    ],
    requiredMetadata: [
      { key: "courseName", label: "Course name", required: true, privacy: "public" },
      { key: "issuer", label: "Issuer", required: true, privacy: "public" },
      { key: "completionDate", label: "Completion date", required: true, privacy: "public" },
      { key: "credentialLevel", label: "Credential level", required: false, privacy: "public" },
    ],
    metadataStorage: ["R2", "IPFS"],
    evidenceStorage: ["R2", "D1", "Convex"],
    privacyLevel: "limited",
    retention: "Keep public metadata permanently; keep private proof references under DAO retention policy.",
    riskControls: [
      "Never publish private learner identifiers in token metadata.",
      "Require reviewer approval before reward-linked minting.",
      "Revoke or supersede when an issuer invalidates the credential.",
      "All wallet-to-wallet transfers must revert; issuer mint, renew, and revoke are the only lifecycle actions.",
    ],
    statusFlow: defaultFlow,
    onChainFields: ["tokenId", "recipient", "tokenURI", "locked", "credentialId", "evidenceHash", "expiresAt", "revoked"],
    offChainFields: ["completionProofUri", "completionProofHash", "reviewerWallet", "rewardAction", "tcasIssuePacketId"],
    proposalRequired: false,
    active: true,
  },
  {
    id: "tccg.work-order.nft.v1",
    schema: "dao.dynamic-nft-policy.v1",
    version: "1.0.0",
    name: "Work Order NFT",
    shortName: "Work Order",
    recordType: "work_order",
    sourceOfTruthPrefix: "TCCG-WO",
    summary:
      "Operational record for approved construction work orders, task scope, assignment, and closeout path.",
    tokenStandard: "ERC721",
    transferability: "restricted",
    defaultChainId: 8453,
    contractScope: "Work-order NFT contract with admin-controlled assignment and closeout metadata.",
    issuerRoles: ["Work board administrator", "Project owner"],
    approverRoles: ["Project owner", "DAO reviewer when daoRequired is true"],
    revocationRoles: ["Project owner", "DAO governance"],
    mintTriggers: [
      "Work item reaches ready or active status",
      "Scope and budget are approved",
      "Owner and assignee wallet checks pass",
    ],
    requiredEvidence: [
      {
        id: "approved-scope",
        label: "Approved scope",
        source: "constructionWorkItems.scope",
        required: true,
        privacy: "public",
      },
      {
        id: "budget-approval",
        label: "Budget or reward approval",
        source: "constructionWorkItems.budgetUsd and rewardTut",
        required: true,
        privacy: "limited",
      },
    ],
    requiredMetadata: [
      { key: "publicId", label: "Work item ID", required: true, privacy: "public" },
      { key: "trade", label: "Trade", required: true, privacy: "public" },
      { key: "location", label: "Location", required: true, privacy: "limited" },
      { key: "due", label: "Due date", required: true, privacy: "public" },
    ],
    metadataStorage: ["R2", "IPFS"],
    evidenceStorage: ["R2", "D1", "Convex"],
    privacyLevel: "limited",
    retention: "Keep the public work-order record; archive private commercial attachments by project policy.",
    riskControls: [
      "Do not expose private owner, payroll, supplier, or bid data in public metadata.",
      "Require DAO approval when the work order spends DAO funds or issues TUT rewards.",
      "Use superseded status for scope revisions instead of mutating historical metadata.",
    ],
    statusFlow: defaultFlow,
    onChainFields: ["tokenId", "assignedWallet", "tokenURI", "status"],
    offChainFields: ["scopeUri", "budgetApprovalHash", "deliverables", "daoRequired"],
    proposalRequired: true,
    active: true,
  },
  {
    id: "tccg.work-deliverable.nft.v1",
    schema: "dao.dynamic-nft-policy.v1",
    version: "1.0.0",
    name: "Work Deliverable NFT",
    shortName: "Deliverable",
    recordType: "work_deliverable",
    sourceOfTruthPrefix: "TCCG-DELIV",
    summary:
      "Closeout credential for accepted deliverables such as models, reports, inspections, and field packets.",
    tokenStandard: "ERC721",
    transferability: "soulbound",
    defaultChainId: 8453,
    contractScope: "Credential contract for contributor and project closeout proofs.",
    issuerRoles: ["Work reviewer", "Project owner"],
    approverRoles: ["Work reviewer", "Quality reviewer"],
    revocationRoles: ["Project owner", "DAO governance"],
    mintTriggers: [
      "Deliverable is submitted",
      "Review decision is approved",
      "Evidence hash and metadata URI are stored",
    ],
    requiredEvidence: [
      {
        id: "deliverable-uri",
        label: "Deliverable URI",
        source: "workDeliverables.url or R2 object",
        required: true,
        privacy: "limited",
      },
      {
        id: "review-approval",
        label: "Review approval",
        source: "workReviews.decision",
        required: true,
        privacy: "public",
      },
    ],
    requiredMetadata: [
      { key: "workItemId", label: "Work item ID", required: true, privacy: "public" },
      { key: "deliverableTitle", label: "Deliverable title", required: true, privacy: "public" },
      { key: "reviewerWallet", label: "Reviewer wallet", required: false, privacy: "public" },
      { key: "acceptedAt", label: "Accepted date", required: true, privacy: "public" },
    ],
    metadataStorage: ["R2", "IPFS"],
    evidenceStorage: ["R2", "D1", "Convex"],
    privacyLevel: "limited",
    retention: "Keep the acceptance metadata permanently; keep underlying work files according to contract terms.",
    riskControls: [
      "Hash files before acceptance so future disputes can verify the original artifact.",
      "Separate public proof metadata from private project files.",
      "Block minting for rejected or change-requested reviews.",
    ],
    statusFlow: defaultFlow,
    onChainFields: ["tokenId", "recipient", "tokenURI", "locked"],
    offChainFields: ["deliverableUri", "deliverableHash", "reviewDecision", "workItemId"],
    proposalRequired: false,
    active: true,
  },
  {
    id: "dao.evidence-packet.nft.v1",
    schema: "dao.dynamic-nft-policy.v1",
    version: "1.0.0",
    name: "DAO Evidence Packet NFT",
    shortName: "DAO Evidence",
    recordType: "dao_evidence",
    sourceOfTruthPrefix: "DAO-EVID",
    summary:
      "Auditable NFT record for approved Tolani Labs evidence packets that support proposals and token actions.",
    tokenStandard: "ERC721",
    transferability: "soulbound",
    defaultChainId: 8453,
    contractScope: "Credential contract for immutable evidence approvals and DAO execution references.",
    issuerRoles: ["DAO evidence reviewer"],
    approverRoles: ["DAO evidence reviewer", "Governor proposal approver"],
    revocationRoles: ["DAO governance"],
    mintTriggers: [
      "Evidence packet approved",
      "Proposal requirement resolved",
      "Evidence URI and hash are available",
    ],
    requiredEvidence: [
      {
        id: "packet-hash",
        label: "Evidence packet hash",
        source: "daoEvidencePackets.evidenceHash",
        required: true,
        privacy: "public",
      },
      {
        id: "review-note",
        label: "DAO review record",
        source: "daoEvidencePackets.reviewNote",
        required: true,
        privacy: "limited",
      },
    ],
    requiredMetadata: [
      { key: "daoPacketId", label: "DAO packet ID", required: true, privacy: "public" },
      { key: "projectId", label: "Project ID", required: true, privacy: "public" },
      { key: "rewardAction", label: "Reward action", required: true, privacy: "public" },
      { key: "proposalId", label: "Proposal ID", required: false, privacy: "public" },
    ],
    metadataStorage: ["R2", "IPFS"],
    evidenceStorage: ["R2", "D1", "Convex"],
    privacyLevel: "limited",
    retention: "Keep evidence approval metadata permanently; store restricted attachments outside public token metadata.",
    riskControls: [
      "Require proposal linkage when the packet triggers treasury or token allocator action.",
      "Never mint from estimated metrics without confidence labels.",
      "Supersede the NFT if the packet is corrected after review.",
    ],
    statusFlow: defaultFlow,
    onChainFields: ["tokenId", "recipient", "tokenURI", "locked"],
    offChainFields: ["evidenceHash", "evidenceUri", "rewardAction", "proposalId"],
    proposalRequired: true,
    active: true,
  },
  {
    id: "tolani.steward-badge.nft.v1",
    schema: "dao.dynamic-nft-policy.v1",
    version: "1.0.0",
    name: "Steward Badge NFT",
    shortName: "Steward Badge",
    recordType: "steward_badge",
    sourceOfTruthPrefix: "TOLANI-BADGE",
    summary:
      "Role and participation badge for stewards, reviewers, contributors, and ecosystem operators.",
    tokenStandard: "ERC1155",
    transferability: "soulbound",
    defaultChainId: 8453,
    contractScope: "Badge contract with role-based minting and non-transferable badge classes.",
    issuerRoles: ["DAO governance", "Steward administrator"],
    approverRoles: ["DAO governance", "Steward administrator"],
    revocationRoles: ["DAO governance"],
    mintTriggers: [
      "Steward role granted",
      "Participation threshold reached",
      "DAO approval completed when required",
    ],
    requiredEvidence: [
      {
        id: "role-source",
        label: "Role source",
        source: "DAO role assignment, delegate record, or steward registry",
        required: true,
        privacy: "public",
      },
      {
        id: "participation-proof",
        label: "Participation proof",
        source: "Governance, review, training, or work records",
        required: false,
        privacy: "limited",
      },
    ],
    requiredMetadata: [
      { key: "badgeClass", label: "Badge class", required: true, privacy: "public" },
      { key: "role", label: "Role", required: true, privacy: "public" },
      { key: "season", label: "Season", required: false, privacy: "public" },
      { key: "issuedReason", label: "Issued reason", required: true, privacy: "limited" },
    ],
    metadataStorage: ["R2", "IPFS"],
    evidenceStorage: ["D1", "Convex", "R2"],
    privacyLevel: "limited",
    retention: "Keep badge metadata permanently; archive participation details by role policy.",
    riskControls: [
      "Keep badge claims factual and role-based, not financial or investment-oriented.",
      "Use revocation when a role is removed for cause.",
      "Require governance approval for badges that imply DAO authority.",
    ],
    statusFlow: defaultFlow,
    onChainFields: ["badgeClassId", "recipient", "amount", "uri", "locked"],
    offChainFields: ["roleSource", "participationProof", "season", "issuedReason"],
    proposalRequired: true,
    active: true,
  },
];

export const nftProgramPhases = [
  {
    id: "intake",
    label: "Source Intake",
    owner: "Source system",
    outputs: ["Canonical record", "Source-of-truth ID", "Policy match"],
  },
  {
    id: "evidence",
    label: "Evidence Pack",
    owner: "Issuer",
    outputs: ["Metadata draft", "Evidence URI", "Evidence hash"],
  },
  {
    id: "approval",
    label: "Policy Review",
    owner: "Approver",
    outputs: ["Approval decision", "Reviewer wallet", "Proposal linkage when required"],
  },
  {
    id: "storage",
    label: "Storage Lock",
    owner: "Operations",
    outputs: ["R2 object", "IPFS metadata", "D1 or Convex state"],
  },
  {
    id: "mint",
    label: "Mint Execution",
    owner: "Mint operator",
    outputs: ["Contract address", "Token ID", "Transaction hash"],
  },
  {
    id: "monitoring",
    label: "Lifecycle Control",
    owner: "DAO governance",
    outputs: ["Revocation", "Supersession", "Audit report"],
  },
];

export const nftRiskControls = [
  "Use the source-of-truth ID as the durable off-chain anchor for every token.",
  "Publish only public or limited metadata; private files stay behind R2/D1 access controls.",
  "Require two-step approval for NFTs that imply credentials, authority, or treasury action.",
  "Record revocation and supersession instead of deleting historical issuance records.",
  "Separate policy versions from token metadata so old mints remain explainable.",
];

export function getNftPolicyById(policyId: string) {
  return nftPolicyRegistry.find((policy) => policy.id === policyId);
}

export function getNftPoliciesByRecordType(recordType: NftRecordType) {
  return nftPolicyRegistry.filter((policy) => policy.recordType === recordType);
}

export function buildNftSourceOfTruthId(
  policyId: string,
  year = new Date().getUTCFullYear(),
  sequence = 1
) {
  const policy = getNftPolicyById(policyId);
  const prefix = policy?.sourceOfTruthPrefix ?? "NFT";
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function formatPolicyRecordType(recordType: NftRecordType) {
  return recordType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function nftStatusLabel(status: NftMintStatus) {
  return nftMintStatuses.find((item) => item.status === status)?.label ?? status;
}

export function isNftPolicyTransferable(policy: Pick<NftDynamicPolicy, "transferability">) {
  return policy.transferability === "transferable";
}

export function evaluateNftMintRailReadiness(
  input: NftMintRailReadinessInput
): NftMintRailReadiness {
  const policy = getNftPolicyById(input.policyId);
  const requireRecipient = policy?.recordType !== "dao_evidence";

  const gates = nftMintRailHardGates.map((gate) => {
    if (gate.id === "policy") {
      const passed = Boolean(policy?.active);
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Policy is missing or inactive.",
      };
    }
    if (gate.id === "source_of_truth") {
      const passed = Boolean(input.sourceOfTruthId?.trim());
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Source-of-truth ID has not been assigned.",
      };
    }
    if (gate.id === "authority") {
      const passed = Boolean(input.issuerRoleResolved && input.approverRoleResolved);
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Issuer and approver roles are not both resolved.",
      };
    }
    if (gate.id === "storage") {
      const passed = Boolean(input.metadataStorageReady && input.evidenceStorageReady);
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Metadata and evidence storage are not both ready.",
      };
    }
    if (gate.id === "duplicate_prevention") {
      const passed = Boolean(input.duplicateCheckReady);
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Duplicate source/evidence checks are not configured.",
      };
    }
    if (gate.id === "contract") {
      const passed = Boolean(input.contractAddress?.trim());
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Mint contract is not configured.",
      };
    }
    if (gate.id === "metadata") {
      const passed = Boolean(input.metadataHash?.trim() && input.evidenceHash?.trim());
      return {
        ...gate,
        passed,
        reason: passed ? undefined : "Metadata hash and evidence hash are not both recorded.",
      };
    }

    const passed = !requireRecipient || Boolean(input.recipientWallet?.trim());
    return {
      ...gate,
      passed,
      reason: passed ? undefined : "Recipient wallet has not been confirmed.",
    };
  });

  const canApprove = gates
    .filter((gate) => gate.requiredBefore === "eligible")
    .every((gate) => gate.passed);
  const canQueueMint =
    canApprove &&
    gates
      .filter((gate) => gate.requiredBefore === "mint_queued")
      .every((gate) => gate.passed);
  const canMint =
    canQueueMint &&
    gates
      .filter((gate) => gate.requiredBefore === "minted")
      .every((gate) => gate.passed);

  return {
    policy,
    gates,
    canApprove,
    canQueueMint,
    canMint,
    nextStatus: canMint ? "mint_queued" : canQueueMint ? "approved" : canApprove ? "eligible" : "draft",
    blockingReasons: gates.filter((gate) => !gate.passed).map((gate) => gate.reason ?? gate.description),
  };
}
