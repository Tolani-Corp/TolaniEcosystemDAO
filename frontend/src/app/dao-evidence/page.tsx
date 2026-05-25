"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Database,
  FileText,
  FlaskConical,
  Hash,
  Layers3,
  Link as LinkIcon,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useIsConvexConfigured } from "@/components/convex-provider";
import { Badge } from "@/components/ui/button";
import { CardContent, CardHeader, GlassCard } from "@/components/ui/cards";
import {
  nextEvidenceStatus,
  sampleDaoEvidencePackets,
  statusLabel,
  totalTutRequested,
  type DaoEvidencePacket,
  type DaoEvidenceStatus,
  type SourceDaoEvidencePacket,
} from "@/lib/labs-evidence";
import { cn, formatAddress, formatNumber } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type PersistedEvidencePacket = Doc<"daoEvidencePackets">;

function variantForStatus(status: DaoEvidenceStatus) {
  if (status === "approved" || status === "executed") return "success";
  if (status === "proposed") return "info";
  if (status === "rejected") return "error";
  return "warning";
}

function fromConvex(packet: PersistedEvidencePacket): DaoEvidencePacket {
  return {
    id: packet._id,
    sourcePacketId: packet.sourcePacketId,
    labValidationId: packet.labValidationId,
    projectId: packet.projectId,
    projectName: packet.projectName,
    sourceSystem: packet.sourceSystem,
    status: packet.status,
    proposalRequired: packet.proposalRequired,
    proposalId: packet.proposalId,
    rewardAction: packet.rewardAction,
    evidenceHash: packet.evidenceHash,
    evidenceUri: packet.evidenceUri,
    metricReports: packet.metricReports as DaoEvidencePacket["metricReports"],
    rewardRecipients: packet.rewardRecipients as DaoEvidencePacket["rewardRecipients"],
    packet: packet.packet as SourceDaoEvidencePacket,
    reviewerWallet: packet.reviewerWallet,
    reviewNote: packet.reviewNote,
    updatedAt: packet.updatedAt,
  };
}

export default function DaoEvidencePage() {
  const isConfigured = useIsConvexConfigured();
  return isConfigured ? <ConvexDaoEvidenceQueue /> : <LocalDaoEvidenceQueue />;
}

function LocalDaoEvidenceQueue() {
  const [packets, setPackets] = useState(sampleDaoEvidencePackets);

  const reviewPacket = (id: string, status: DaoEvidenceStatus, note: string) => {
    setPackets((current) =>
      current.map((packet) =>
        packet.id === id
          ? {
              ...packet,
              status,
              reviewNote: note,
              updatedAt: Date.now(),
            }
          : packet
      )
    );
  };

  return (
    <DaoEvidenceQueueView
      packets={packets}
      dataMode="Local review mode"
      dataModeDetail="Set NEXT_PUBLIC_CONVEX_URL to persist Labs-to-DAO evidence packets in Convex."
      onReview={reviewPacket}
    />
  );
}

function ConvexDaoEvidenceQueue() {
  const { address } = useAccount();
  const persistedPackets = useQuery(api.labsEvidence.list, {});
  const submit = useMutation(api.labsEvidence.submit);
  const review = useMutation(api.labsEvidence.review);

  const packets = useMemo(
    () => (persistedPackets ?? []).map(fromConvex),
    [persistedPackets]
  );

  const seedSample = async () => {
    const sample = sampleDaoEvidencePackets[0];
    await submit({
      sourcePacketId: sample.sourcePacketId,
      labValidationId: sample.labValidationId,
      projectId: sample.projectId,
      projectName: sample.projectName,
      sourceSystem: sample.sourceSystem,
      proposalRequired: sample.proposalRequired,
      proposalId: sample.proposalId,
      rewardAction: sample.rewardAction,
      evidenceHash: sample.evidenceHash,
      evidenceUri: sample.evidenceUri,
      metricReports: sample.metricReports,
      rewardRecipients: sample.rewardRecipients,
      packet: sample.packet,
    });
  };

  const reviewPacket = async (id: string, status: DaoEvidenceStatus, note: string) => {
    await review({
      id: id as Id<"daoEvidencePackets">,
      status,
      reviewerWallet: address,
      reviewNote: note,
    });
  };

  return (
    <DaoEvidenceQueueView
      packets={packets.length ? packets : sampleDaoEvidencePackets}
      dataMode="Convex persistence"
      dataModeDetail={
        persistedPackets && packets.length === 0
          ? "Convex is connected. Seed the sample packet or wait for Tolani Labs intake."
          : "DAO evidence packets are backed by Convex review state."
      }
      isLoading={persistedPackets === undefined}
      isSeedable={Boolean(persistedPackets && packets.length === 0)}
      onSeed={seedSample}
      onReview={reviewPacket}
    />
  );
}

function DaoEvidenceQueueView({
  packets,
  dataMode,
  dataModeDetail,
  isLoading = false,
  isSeedable = false,
  onSeed,
  onReview,
}: {
  packets: DaoEvidencePacket[];
  dataMode: string;
  dataModeDetail: string;
  isLoading?: boolean;
  isSeedable?: boolean;
  onSeed?: () => Promise<void> | void;
  onReview: (id: string, status: DaoEvidenceStatus, note: string) => Promise<void> | void;
}) {
  const [selectedId, setSelectedId] = useState(packets[0]?.id ?? "");
  const selectedPacket = packets.find((packet) => packet.id === selectedId) ?? packets[0];
  const totalTut = packets.reduce((sum, packet) => sum + totalTutRequested(packet), 0);
  const reviewCount = packets.filter((packet) => packet.status === "review").length;
  const proposalCount = packets.filter((packet) => packet.proposalRequired).length;
  const verifiedMetrics = packets.reduce(
    (sum, packet) =>
      sum + packet.metricReports.filter((metric) => metric.confidence === "verified").length,
    0
  );

  const kpis = [
    { label: "Packets", value: packets.length.toString(), icon: ClipboardCheck, tone: "text-cyan-300" },
    { label: "DAO Review", value: reviewCount.toString(), icon: ShieldCheck, tone: "text-amber-300" },
    { label: "Proposal Required", value: proposalCount.toString(), icon: FileText, tone: "text-blue-300" },
    { label: "Verified Metrics", value: verifiedMetrics.toString(), icon: BadgeCheck, tone: "text-emerald-300" },
    { label: "TUT Requested", value: `${formatNumber(totalTut, 0)} TUT`, icon: Coins, tone: "text-lime-300" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-cyan-400/20 bg-gray-950">
        <div className="border-b border-gray-800 bg-gradient-to-r from-cyan-950/40 via-gray-950 to-emerald-950/25 p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="info">Tolani Labs</Badge>
                <Badge variant="success">DAO evidence</Badge>
                <Badge variant="warning">{dataMode}</Badge>
              </div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Labs Evidence Review
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
                Review validated supplier, smart HVAC, ESG, and training evidence before it becomes a
                DAO proposal, treasury action, token allocator budget, or TUT reward decision.
              </p>
              <p className="mt-2 text-xs text-cyan-200">{dataModeDetail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isSeedable && onSeed && (
                <button
                  type="button"
                  onClick={() => onSeed()}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  <Database className="h-4 w-4" />
                  Seed sample
                </button>
              )}
              <a
                href="/proposals/create"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
              >
                <FileText className="h-4 w-4" />
                Draft proposal
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-gray-800/70 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-gray-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <kpi.icon className={cn("h-5 w-5", kpi.tone)} />
                <span className="text-xs text-gray-500">{isLoading ? "Syncing" : "Ready"}</span>
              </div>
              <p className="text-xs uppercase text-gray-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GlassCard className="rounded-lg">
          <CardHeader
            title="Evidence Queue"
            description="Labs-approved packets ready for DAO disposition."
            action={<Badge variant={reviewCount ? "warning" : "success"}>{reviewCount} in review</Badge>}
          />
          <CardContent className="space-y-3">
            {packets.map((packet) => (
              <motion.button
                key={packet.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setSelectedId(packet.id)}
                className={cn(
                  "w-full rounded-lg border bg-gray-950/70 p-4 text-left transition hover:border-cyan-400/40",
                  selectedPacket?.id === packet.id ? "border-cyan-400/60" : "border-gray-800"
                )}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={variantForStatus(packet.status)}>{statusLabel(packet.status)}</Badge>
                  <Badge variant={packet.proposalRequired ? "info" : "default"}>
                    {packet.proposalRequired ? "Proposal path" : "Admin action"}
                  </Badge>
                  <span className="text-xs text-gray-500">{packet.sourceSystem}</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h2 className="text-base font-semibold text-white">{packet.projectName}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {packet.labValidationId} / {packet.rewardAction.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-sm font-semibold text-amber-300">
                      {formatNumber(totalTutRequested(packet), 0)} TUT
                    </p>
                    <p className="mt-1 text-xs text-gray-500">requested</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </CardContent>
        </GlassCard>

        {selectedPacket && (
          <aside className="rounded-lg border border-gray-800 bg-gray-950">
            <div className="border-b border-gray-800 p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">{selectedPacket.projectId}</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{selectedPacket.projectName}</h2>
                </div>
                <Badge variant={variantForStatus(selectedPacket.status)}>
                  {statusLabel(selectedPacket.status)}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-gray-400">
                Confirm the Labs validation packet, evidence references, ESG metrics, and recipient
                allocation before authorizing DAO action.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-sm">
                {[
                  { label: "Lab validation", value: selectedPacket.labValidationId, icon: FlaskConical },
                  { label: "Source packet", value: selectedPacket.sourcePacketId, icon: Layers3 },
                  {
                    label: "Reviewer",
                    value: selectedPacket.reviewerWallet
                      ? formatAddress(selectedPacket.reviewerWallet)
                      : "Unassigned",
                    icon: ShieldCheck,
                  },
                  { label: "Proposal", value: selectedPacket.proposalId ?? "Not drafted", icon: FileText },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">{row.label}</p>
                      <p className="mt-0.5 break-all text-gray-200">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                {selectedPacket.evidenceHash && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Hash className="h-4 w-4 text-emerald-300" />
                      <p className="text-xs uppercase text-gray-500">Evidence hash</p>
                    </div>
                    <p className="break-all text-xs text-gray-300">{selectedPacket.evidenceHash}</p>
                  </div>
                )}
                {selectedPacket.evidenceUri && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-blue-300" />
                      <p className="text-xs uppercase text-gray-500">Evidence URI</p>
                    </div>
                    <p className="break-all text-xs text-gray-300">{selectedPacket.evidenceUri}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs uppercase text-gray-500">Metric reports</p>
                <div className="space-y-2">
                  {selectedPacket.metricReports.map((metric) => (
                    <div key={metric.metricId} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{metric.label}</p>
                        <Badge variant={metric.confidence === "verified" ? "success" : "warning"}>
                          {metric.confidence}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        {metric.value}
                        {metric.unit ? ` ${metric.unit}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase text-gray-500">Reward recipients</p>
                <div className="space-y-2">
                  {selectedPacket.rewardRecipients.map((recipient) => (
                    <div key={`${recipient.role}-${recipient.amountTut}`} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{recipient.role}</p>
                        <p className="text-sm font-semibold text-amber-300">
                          {formatNumber(recipient.amountTut, 0)} TUT
                        </p>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-gray-400">{recipient.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPacket.reviewNote && (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-950/20 p-4">
                  <p className="text-sm font-semibold text-white">Review note</p>
                  <p className="mt-1 text-sm leading-6 text-gray-300">{selectedPacket.reviewNote}</p>
                </div>
              )}

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onReview(
                      selectedPacket.id,
                      nextEvidenceStatus(selectedPacket.status),
                      "Advanced through DAO evidence review."
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
                  disabled={selectedPacket.status === "executed" || selectedPacket.status === "rejected"}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Advance review
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onReview(selectedPacket.id, "rejected", "Returned to Labs for supplier or evidence response.")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                  disabled={selectedPacket.status === "executed" || selectedPacket.status === "rejected"}
                >
                  <XCircle className="h-4 w-4" />
                  Request revision
                </button>
              </div>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
