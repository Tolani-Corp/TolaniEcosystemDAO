"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  BadgeCheck,
  ClipboardCheck,
  Database,
  FileCheck2,
  Hash,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useIsConvexConfigured } from "@/components/convex-provider";
import { Badge } from "@/components/ui/button";
import { CardContent, CardHeader, GlassCard } from "@/components/ui/cards";
import {
  buildNftSourceOfTruthId,
  evaluateNftMintRailReadiness,
  formatPolicyRecordType,
  nftMintStatuses,
  nftPolicyRegistry,
  nftProgramPhases,
  nftRiskControls,
  nftStatusLabel,
  type NftMintStatus,
} from "@/lib/nft-policy";
import { cn, formatAddress } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

type NftMintRecord = Doc<"nftMintRecords">;

const statusVariants: Record<NftMintStatus, "default" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  eligible: "info",
  approved: "success",
  mint_queued: "warning",
  minted: "success",
  revoked: "error",
  superseded: "warning",
  rejected: "error",
};

export default function NftPolicyPage() {
  const isConfigured = useIsConvexConfigured();
  return isConfigured ? <ConvexNftPolicyPage /> : <NftPolicyView records={[]} dataMode="Local policy mode" />;
}

function ConvexNftPolicyPage() {
  const records = useQuery(api.nftMintRecords.list, {});

  return (
    <NftPolicyView
      records={records ?? []}
      dataMode={records === undefined ? "Loading Convex records" : "Convex mint records"}
    />
  );
}

function NftPolicyView({
  records,
  dataMode,
}: {
  records: NftMintRecord[];
  dataMode: string;
}) {
  const activePolicyCount = nftPolicyRegistry.filter((policy) => policy.active).length;
  const soulboundCount = nftPolicyRegistry.filter((policy) => policy.transferability === "soulbound").length;
  const proposalGateCount = nftPolicyRegistry.filter((policy) => policy.proposalRequired).length;
  const storageTargets = useMemo(
    () => new Set(nftPolicyRegistry.flatMap((policy) => [...policy.metadataStorage, ...policy.evidenceStorage])),
    []
  );
  const mintRailReview = useMemo(
    () =>
      evaluateNftMintRailReadiness({
        policyId: "tut.training-certificate.nft.v1",
        sourceOfTruthId: buildNftSourceOfTruthId("tut.training-certificate.nft.v1", 2026, 1),
        issuerRoleResolved: false,
        approverRoleResolved: false,
        metadataStorageReady: false,
        evidenceStorageReady: false,
        duplicateCheckReady: false,
      }),
    []
  );

  const mintedCount = records.filter((record) => record.status === "minted").length;
  const reviewCount = records.filter((record) =>
    ["eligible", "approved", "mint_queued"].includes(record.status)
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-gray-800/60 bg-gray-950/70 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Ecosystem NFT program</Badge>
              <Badge variant="success">Source-of-truth anchored</Badge>
              <Badge variant="warning">{dataMode}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">
                NFT Policy and Issuance Controls
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-300">
                Dynamic policy registry for training certificates, work orders, accepted deliverables,
                DAO evidence packets, and steward badges. Each token starts from a canonical source ID,
                then moves through evidence, approval, storage, minting, and lifecycle review.
              </p>
            </div>
          </div>
          <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px]">
            <Metric label="Policies" value={activePolicyCount.toString()} icon={Layers3} />
            <Metric label="Soulbound" value={soulboundCount.toString()} icon={LockKeyhole} />
            <Metric label="Proposal gates" value={proposalGateCount.toString()} icon={ShieldCheck} />
            <Metric label="Mint records" value={records.length.toString()} icon={Hash} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-400">Storage targets</p>
            <p className="text-2xl font-semibold text-white">{storageTargets.size}</p>
            <p className="text-sm text-gray-400">{Array.from(storageTargets).join(", ")}</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-400">Queued for review</p>
            <p className="text-2xl font-semibold text-white">{reviewCount}</p>
            <p className="text-sm text-gray-400">Eligible, approved, or mint queued records.</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-400">Minted</p>
            <p className="text-2xl font-semibold text-white">{mintedCount}</p>
            <p className="text-sm text-gray-400">Records with contract and token IDs captured.</p>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-400">Default chain</p>
            <p className="text-2xl font-semibold text-white">Base</p>
            <p className="text-sm text-gray-400">Policy default chain ID 8453.</p>
          </CardContent>
        </GlassCard>
      </section>

      <GlassCard>
        <CardHeader
          title="Policy Registry"
          description="Source-of-truth prefixes, evidence gates, storage targets, and lifecycle controls."
          action={<Badge variant="info">v1.0.0</Badge>}
        />
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {nftPolicyRegistry.map((policy, index) => (
            <div key={policy.id} className="rounded-lg border border-gray-800/70 bg-gray-950/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">{formatPolicyRecordType(policy.recordType)}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{policy.name}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={policy.transferability === "soulbound" ? "success" : "warning"}>
                    {policy.transferability}
                  </Badge>
                  <Badge variant="default">{policy.tokenStandard}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-300">{policy.summary}</p>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <PolicyFact label="Policy ID" value={policy.id} />
                <PolicyFact label="Source ID" value={buildNftSourceOfTruthId(policy.id, 2026, index + 1)} />
                <PolicyFact label="Issuer roles" value={policy.issuerRoles.join(", ")} />
                <PolicyFact label="Storage" value={policy.metadataStorage.join(" / ")} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Checklist title="Required Evidence" items={policy.requiredEvidence.map((item) => item.label)} />
                <Checklist title="Risk Controls" items={policy.riskControls.slice(0, 2)} />
              </div>
            </div>
          ))}
        </CardContent>
      </GlassCard>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <CardHeader
            title="Road To Minting"
            description="Operational workflow from source record to lifecycle control."
            action={<Workflow className="h-5 w-5 text-cyan-300" />}
          />
          <CardContent className="space-y-4">
            {nftProgramPhases.map((phase, index) => (
              <div key={phase.id} className="grid gap-3 rounded-lg border border-gray-800/70 bg-gray-950/50 p-4 md:grid-cols-[48px_1fr]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-sm font-semibold text-cyan-300">
                  {index + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{phase.label}</h3>
                    <Badge variant="default">{phase.owner}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{phase.outputs.join(" | ")}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader
            title="Lifecycle States"
            description="Mint records move through these statuses before and after issuance."
            action={<BadgeCheck className="h-5 w-5 text-emerald-300" />}
          />
          <CardContent className="space-y-3">
            {nftMintStatuses.map((item) => (
              <div key={item.status} className="rounded-lg border border-gray-800/70 bg-gray-950/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{item.label}</p>
                  <Badge variant={statusVariants[item.status]}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-400">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </GlassCard>
      </section>

      <GlassCard>
        <CardHeader
          title="Dynamic Pre-Mint Rail"
          description="Records may be prepared before final infrastructure is settled, but mint execution stays blocked until every hard gate passes."
          action={<Badge variant={mintRailReview.canMint ? "success" : "warning"}>{mintRailReview.nextStatus}</Badge>}
        />
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {mintRailReview.gates.map((gate) => (
            <div key={gate.id} className="rounded-lg border border-gray-800/70 bg-gray-950/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{gate.label}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{gate.description}</p>
                </div>
                <Badge variant={gate.passed ? "success" : "warning"}>
                  {gate.passed ? "Ready" : "Gate"}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariants[gate.requiredBefore]}>
                  before {nftStatusLabel(gate.requiredBefore)}
                </Badge>
                {!gate.passed && gate.reason ? <span className="text-xs text-gray-500">{gate.reason}</span> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </GlassCard>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <GlassCard>
          <CardHeader
            title="Risk Mitigation"
            description="Controls that keep credentials useful without exposing private data."
            action={<ShieldCheck className="h-5 w-5 text-emerald-300" />}
          />
          <CardContent className="space-y-3">
            {nftRiskControls.map((control) => (
              <div key={control} className="flex gap-3 rounded-lg border border-gray-800/70 bg-gray-950/50 p-4">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-gray-300">{control}</p>
              </div>
            ))}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader
            title="Mint Records"
            description="Persisted issuance records from Convex. Local mode shows policy only until Convex is configured."
            action={<Database className="h-5 w-5 text-cyan-300" />}
          />
          <CardContent className="space-y-3">
            {records.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/50 p-6 text-sm leading-6 text-gray-400">
                No NFT mint records yet. Create records from training completion, work-order approval,
                accepted deliverables, DAO evidence approval, or steward badge assignment.
              </div>
            ) : (
              records.slice(0, 6).map((record) => (
                <div key={record._id} className="rounded-lg border border-gray-800/70 bg-gray-950/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{record.recordTitle}</p>
                      <p className="mt-1 text-xs text-gray-500">{record.sourceOfTruthId}</p>
                    </div>
                    <Badge variant={statusVariants[record.status]}>{nftStatusLabel(record.status)}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
                    <RecordFact icon={ClipboardCheck} label="Policy" value={record.policyId} />
                    <RecordFact icon={Hash} label="Token" value={record.tokenId ?? "Not minted"} />
                    <RecordFact icon={Layers3} label="Chain" value={record.chainId.toString()} />
                    <RecordFact
                      icon={LockKeyhole}
                      label="Recipient"
                      value={record.recipientWallet ? formatAddress(record.recipientWallet) : "Pending"}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </GlassCard>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="rounded-lg border border-gray-800/70 bg-gray-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">{label}</p>
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PolicyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-900/70 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-200">{value}</p>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-gray-900/70 p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-6 text-gray-300">
            <BadgeCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordFact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Layers3;
}) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg bg-gray-900/70 p-3")}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 break-words text-gray-200">{value}</p>
      </div>
    </div>
  );
}
