export type DaoEvidenceStatus = "review" | "approved" | "proposed" | "executed" | "rejected";

export type DaoEvidenceRewardAction =
  | "none"
  | "task_bounty"
  | "training_reward"
  | "treasury_transfer"
  | "token_allocator";

export interface DaoMetricReport {
  metricId: string;
  label: string;
  value: string;
  unit?: string;
  confidence: "estimated" | "measured" | "verified";
}

export interface DaoRewardRecipient {
  wallet?: string;
  role: string;
  amountTut: number;
  reason: string;
}

export interface SourceDaoMetricReport {
  metricId: string;
  value: number | null;
  unit: string;
  category: "environmental" | "social" | "governance" | "training";
}

export interface SourceDaoRewardRecipient {
  wallet: string;
  role: string;
  amount: number;
  token: "uTUT" | "TUT";
}

export interface SourceDaoEvidencePacket {
  daoPacketId: string;
  schema: "dao.esg-reward-evidence.v1";
  labValidationId: string;
  sourcePacketId: string;
  projectId: string;
  metricReports: SourceDaoMetricReport[];
  evidenceHash?: string | null;
  evidenceUri?: string | null;
  rewardAction: DaoEvidenceRewardAction;
  rewardRecipients: SourceDaoRewardRecipient[];
  proposalRequired: boolean;
  proposalId?: string | null;
  status: DaoEvidenceStatus;
}

export interface DaoEvidencePacket {
  id: string;
  sourcePacketId: string;
  labValidationId: string;
  projectId: string;
  projectName: string;
  sourceSystem: string;
  status: DaoEvidenceStatus;
  proposalRequired: boolean;
  proposalId?: string;
  rewardAction: DaoEvidenceRewardAction;
  evidenceHash?: string;
  evidenceUri?: string;
  metricReports: DaoMetricReport[];
  rewardRecipients: DaoRewardRecipient[];
  packet: SourceDaoEvidencePacket;
  reviewerWallet?: string;
  reviewNote?: string;
  updatedAt: number;
}

export const sampleDaoEvidencePackets: DaoEvidencePacket[] = [
  {
    id: "dao-ev-sample-smart-hvac-001",
    sourcePacketId: "tsg-src-smart-hvac-001",
    labValidationId: "lab-val-smart-hvac-001",
    projectId: "tccg-atl-hvac-2026-01",
    projectName: "Atlanta mixed-use smart HVAC retrofit",
    sourceSystem: "Tolani Labs",
    status: "review",
    proposalRequired: true,
    rewardAction: "token_allocator",
    evidenceHash: "0x8f1e0f8c7a2a90b7e3f07a2d4c61c2b1b2dfb1b664de1c2c5b70fb9c4e2a6d91",
    evidenceUri: "ipfs://tolani-labs/sample-smart-hvac-validation.json",
    metricReports: [
      {
        metricId: "energy-baseline",
        label: "Energy baseline captured",
        value: "12",
        unit: "months",
        confidence: "verified",
      },
      {
        metricId: "iaq-sensor-pass",
        label: "IAQ sensor validation",
        value: "Pass",
        confidence: "verified",
      },
      {
        metricId: "projected-savings",
        label: "Projected HVAC efficiency gain",
        value: "14",
        unit: "%",
        confidence: "estimated",
      },
    ],
    rewardRecipients: [
      {
        role: "Lab validation lead",
        amountTut: 450,
        reason: "Validated evidence schema and smart HVAC supplier packet.",
      },
      {
        role: "Installer readiness reviewer",
        amountTut: 300,
        reason: "Confirmed install prerequisites and closeout evidence requirements.",
      },
    ],
    packet: {
      daoPacketId: "dao_lab-val-smart-hvac-001",
      schema: "dao.esg-reward-evidence.v1",
      labValidationId: "lab-val-smart-hvac-001",
      sourcePacketId: "tsg-src-smart-hvac-001",
      projectId: "tccg-atl-hvac-2026-01",
      metricReports: [
        {
          metricId: "energy-baseline",
          value: 12,
          unit: "months",
          category: "environmental",
        },
        {
          metricId: "iaq-sensor-pass",
          value: 1,
          unit: "pass",
          category: "environmental",
        },
        {
          metricId: "projected-savings",
          value: 14,
          unit: "%",
          category: "environmental",
        },
      ],
      evidenceHash: "0x8f1e0f8c7a2a90b7e3f07a2d4c61c2b1b2dfb1b664de1c2c5b70fb9c4e2a6d91",
      evidenceUri: "ipfs://tolani-labs/sample-smart-hvac-validation.json",
      rewardAction: "token_allocator",
      rewardRecipients: [],
      proposalRequired: true,
      proposalId: null,
      status: "review",
    },
    updatedAt: Date.now(),
  },
];

export function statusLabel(status: DaoEvidenceStatus) {
  const labels: Record<DaoEvidenceStatus, string> = {
    review: "DAO review",
    approved: "Approved",
    proposed: "Proposal drafted",
    executed: "Executed",
    rejected: "Rejected",
  };

  return labels[status];
}

export function nextEvidenceStatus(status: DaoEvidenceStatus): DaoEvidenceStatus {
  if (status === "review") return "approved";
  if (status === "approved") return "proposed";
  if (status === "proposed") return "executed";
  return status;
}

export function totalTutRequested(packet: Pick<DaoEvidencePacket, "rewardRecipients">) {
  return packet.rewardRecipients.reduce((sum, recipient) => sum + recipient.amountTut, 0);
}
