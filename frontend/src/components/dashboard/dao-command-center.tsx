"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  FileText,
  GraduationCap,
  Landmark,
  Layers3,
  LineChart,
  Network,
  Rocket,
  ShieldCheck,
  Target,
  Timer,
  Vault,
  Vote,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ActivityChart, ParticipationChart } from "@/components/dashboard/activity-charts";
import { Badge, ProgressBar } from "@/components/ui/button";
import { CardContent, CardHeader, GlassCard } from "@/components/ui/cards";
import {
  CONTRACT_ADDRESSES,
  DEFAULT_CHAIN_ID,
  getChainName,
} from "@/config/contracts";
import {
  useDelegate,
  useGovernorParams,
  useTokenBalance,
  useVotingPower,
} from "@/hooks/useGovernance";
import { useProposals, type Proposal } from "@/hooks/useProposals";
import { useContracts, useEffectiveChainId } from "@/hooks/useContracts";
import { useEcosystemValue, useTreasuryStats } from "@/hooks/useTreasury";
import { cn, formatAddress, formatNumber } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const fallbackActivity = [
  { date: "W1", proposals: 2, votes: 18, participation: 22 },
  { date: "W2", proposals: 1, votes: 24, participation: 28 },
  { date: "W3", proposals: 3, votes: 42, participation: 36 },
  { date: "W4", proposals: 2, votes: 31, participation: 33 },
  { date: "W5", proposals: 4, votes: 56, participation: 44 },
  { date: "W6", proposals: 3, votes: 63, participation: 48 },
];

const fallbackParticipation = [
  { month: "Jan", rate: 18 },
  { month: "Feb", rate: 24 },
  { month: "Mar", rate: 31 },
  { month: "Apr", rate: 37 },
  { month: "May", rate: 46 },
  { month: "Jun", rate: 52 },
];

const laneCards = [
  {
    title: "Training Rewards",
    href: "/training",
    status: "Relayer governed",
    detail: "IBM SkillsBuild, Google, Microsoft, Revit, and BIM credentials feed TUT reward access.",
    icon: BookOpen,
    accent: "text-cyan-300",
    rail: "bg-cyan-400",
  },
  {
    title: "Treasury",
    href: "/treasury",
    status: "Timelock protected",
    detail: "DAO-controlled funds, payroll, escrow, and execution reserves stay visible.",
    icon: Vault,
    accent: "text-amber-300",
    rail: "bg-amber-400",
  },
  {
    title: "Staking",
    href: "/staking",
    status: "Participation layer",
    detail: "Stakeholder alignment and voting readiness for TUT holders.",
    icon: Coins,
    accent: "text-emerald-300",
    rail: "bg-emerald-400",
  },
  {
    title: "DAO Evidence",
    href: "/dao-evidence",
    status: "Labs handoff",
    detail: "Review validated supplier, ESG, smart HVAC, and training evidence before DAO action.",
    icon: ClipboardCheck,
    accent: "text-blue-300",
    rail: "bg-blue-400",
  },
  {
    title: "Bounties",
    href: "/bounties",
    status: "Work pipeline",
    detail: "Route ecosystem work into scoped tasks with public progress signals.",
    icon: Target,
    accent: "text-rose-300",
    rail: "bg-rose-400",
  },
];

const ecosystemMapNodes: Array<{
  label: string;
  status: string;
  detail: string;
  icon: LucideIcon;
  color: string;
  border: string;
}> = [
  {
    label: "TCCG.work",
    status: "Project demand",
    detail: "Scopes retrofit work, site approval, contractor readiness, and field execution demand.",
    icon: Layers3,
    color: "text-blue-300",
    border: "border-blue-400/25",
  },
  {
    label: "Smart HVAC",
    status: "Device layer",
    detail: "Controllers, meters, IAQ sensors, and gateways create energy and operations telemetry.",
    icon: Activity,
    color: "text-cyan-300",
    border: "border-cyan-400/25",
  },
  {
    label: "ESG",
    status: "Evidence review",
    detail: "Energy, IAQ, refrigerant, and closeout records become auditable impact evidence.",
    icon: BadgeCheck,
    color: "text-lime-300",
    border: "border-lime-400/25",
  },
  {
    label: "uTUT",
    status: "Completion credit",
    detail: "Training, certification, and participation points issued through DAO reward rails.",
    icon: GraduationCap,
    color: "text-emerald-300",
    border: "border-emerald-400/25",
  },
  {
    label: "TUT",
    status: "Governance token",
    detail: "Base governance token for proposals, treasury decisions, and conversion reserves.",
    icon: Coins,
    color: "text-amber-300",
    border: "border-amber-400/25",
  },
  {
    label: "sTUT",
    status: "Staked posture",
    detail: "Staked TUT position for longer-term DAO alignment; reward funding remains gated.",
    icon: Vault,
    color: "text-rose-300",
    border: "border-rose-400/25",
  },
];

const ecosystemMapFlows = [
  {
    from: "TCCG.work",
    to: "Smart HVAC",
    detail: "Approved scopes create retrofit procurement and installation work.",
  },
  {
    from: "Smart HVAC",
    to: "ESG",
    detail: "Telemetry and closeout records become impact evidence.",
  },
  {
    from: "ESG",
    to: "uTUT",
    detail: "Accepted evidence can back learning and reward eligibility.",
  },
  {
    from: "uTUT",
    to: "TUT",
    detail: "The DAO converter governs utility-credit conversion.",
  },
  {
    from: "TUT",
    to: "sTUT",
    detail: "TUT holders stake only through the DAO staking pool.",
  },
];

function toFiniteNumber(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTut(value: number, compact = true) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 TUT";
  }

  return `${formatNumber(value, compact && value >= 100 ? 0 : 2)} TUT`;
}

function proposalBadgeVariant(stateNum: number): BadgeVariant {
  if (stateNum === 1) return "info";
  if (stateNum === 4 || stateNum === 5 || stateNum === 7) return "success";
  if (stateNum === 0) return "warning";
  if (stateNum === 2 || stateNum === 3 || stateNum === 6) return "error";
  return "default";
}

function buildActivityData(proposals: Proposal[]) {
  if (!proposals.length) {
    return fallbackActivity;
  }

  return proposals
    .slice(0, 6)
    .reverse()
    .map((proposal, index) => {
      const votes =
        toFiniteNumber(proposal.forVotesFormatted) +
        toFiniteNumber(proposal.againstVotesFormatted) +
        toFiniteNumber(proposal.abstainVotesFormatted);

      return {
        date: `P${index + 1}`,
        proposals: 1,
        votes: Math.max(1, Math.round(votes)),
        participation: Math.min(96, Math.max(12, Math.round(votes / 100))),
      };
    });
}

function buildParticipationData(proposals: Proposal[]) {
  if (!proposals.length) {
    return fallbackParticipation;
  }

  return proposals
    .slice(0, 6)
    .reverse()
    .map((proposal, index) => {
      const totalVotes =
        toFiniteNumber(proposal.forVotesFormatted) +
        toFiniteNumber(proposal.againstVotesFormatted) +
        toFiniteNumber(proposal.abstainVotesFormatted);

      return {
        month: `P${index + 1}`,
        rate: Math.min(92, Math.max(8, Math.round(totalVotes / 150))),
      };
    });
}

export function DAOCommandCenter() {
  const { address, isConnected } = useAccount();
  const contracts = useContracts();
  const effectiveChainId = useEffectiveChainId();
  const { votingPowerFormatted } = useVotingPower();
  const { balanceFormatted } = useTokenBalance();
  const { delegate, hasDelegated, isSelfDelegated } = useDelegate();
  const {
    proposalThresholdFormatted,
    quorumNumerator,
    votingDelay,
    votingPeriod,
  } = useGovernorParams();
  const { proposals, isLoading: proposalsLoading } = useProposals();
  const treasuryStats = useTreasuryStats();
  const ecosystemValue = useEcosystemValue();

  const addresses =
    CONTRACT_ADDRESSES[effectiveChainId as keyof typeof CONTRACT_ADDRESSES] ??
    CONTRACT_ADDRESSES[DEFAULT_CHAIN_ID];
  const addressBook = addresses as Record<string, `0x${string}` | undefined>;
  const trainingRewardsAddress =
    addressBook.trainingRewardsV2 ?? addressBook.trainingRewards;

  const proposalCounts = useMemo(
    () => ({
      active: proposals.filter((proposal) => proposal.stateNum === 1).length,
      pending: proposals.filter((proposal) => proposal.stateNum === 0).length,
      succeeded: proposals.filter((proposal) => proposal.stateNum === 4).length,
      queued: proposals.filter((proposal) => proposal.stateNum === 5).length,
      executed: proposals.filter((proposal) => proposal.stateNum === 7).length,
    }),
    [proposals]
  );

  const walletTut = toFiniteNumber(balanceFormatted);
  const votingPower = toFiniteNumber(votingPowerFormatted);
  const proposalThreshold = toFiniteNumber(proposalThresholdFormatted);
  const treasuryTut = toFiniteNumber(treasuryStats.tokenBalanceFormatted);
  const ecosystemTut = toFiniteNumber(ecosystemValue.totalTokensFormatted);
  const thresholdProgress =
    proposalThreshold > 0 ? Math.min((votingPower / proposalThreshold) * 100, 100) : 0;
  const activityData = useMemo(() => buildActivityData(proposals), [proposals]);
  const participationData = useMemo(() => buildParticipationData(proposals), [proposals]);

  const metrics = [
    {
      label: "Wallet TUT",
      value: isConnected ? formatTut(walletTut) : "Connect wallet",
      icon: Wallet,
      caption: isConnected && address ? formatAddress(address) : "Personal balance",
      color: "text-cyan-300",
    },
    {
      label: "Voting Power",
      value: formatTut(votingPower),
      icon: Vote,
      caption: hasDelegated ? "Delegation active" : "Delegation needed",
      color: "text-emerald-300",
    },
    {
      label: "Active Proposals",
      value: proposalCounts.active.toString(),
      icon: FileText,
      caption: `${proposals.length} tracked on-chain`,
      color: "text-blue-300",
    },
    {
      label: "Treasury TUT",
      value: formatTut(treasuryTut),
      icon: Landmark,
      caption: `${formatTut(ecosystemTut)} ecosystem`,
      color: "text-amber-300",
    },
  ];

  const readiness = [
    {
      label: "Governor",
      value: formatAddress(contracts.governor.address),
      icon: ShieldCheck,
      tone: "text-emerald-300",
    },
    {
      label: "Timelock",
      value: formatAddress(contracts.timelock.address),
      icon: Timer,
      tone: "text-blue-300",
    },
    {
      label: "Treasury",
      value: formatAddress(contracts.treasury.address),
      icon: Vault,
      tone: "text-amber-300",
    },
    {
      label: "Training Rewards",
      value: trainingRewardsAddress ? formatAddress(trainingRewardsAddress) : "Not configured",
      icon: GraduationCap,
      tone: "text-cyan-300",
    },
  ];

  const queueStates: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
  }> = [
    { label: "Pending", value: proposalCounts.pending, icon: Clock3, color: "text-amber-300" },
    { label: "Active", value: proposalCounts.active, icon: Activity, color: "text-blue-300" },
    { label: "Succeeded", value: proposalCounts.succeeded, icon: CheckCircle2, color: "text-emerald-300" },
    { label: "Queued", value: proposalCounts.queued, icon: Layers3, color: "text-cyan-300" },
    { label: "Executed", value: proposalCounts.executed, icon: BadgeCheck, color: "text-lime-300" },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-lg border border-cyan-400/20 bg-gray-950"
      >
        <div className="border-b border-gray-800/70 bg-gradient-to-r from-cyan-950/50 via-gray-950 to-amber-950/30 p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="info">Base governance</Badge>
                <Badge variant="success">TUT rewards access</Badge>
                <Badge variant="warning">Training administration</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Tolani DAO Command Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300 sm:text-base">
                A live operating surface for proposals, TUT voting power, treasury execution,
                and credential-backed training rewards across Tolani Labs and the DAO.
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-lg border border-gray-800 bg-gray-900/70 p-3">
              <div>
                <p className="text-xs uppercase text-gray-500">Network</p>
                <p className="mt-1 text-sm font-semibold text-white">{getChainName(effectiveChainId)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Quorum</p>
                <p className="mt-1 text-sm font-semibold text-white">{quorumNumerator}%</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Delay</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatNumber(votingDelay, 0)} blocks</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Period</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatNumber(votingPeriod, 0)} blocks</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/proposals/create"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400"
            >
              <Rocket className="h-4 w-4" />
              New proposal
            </Link>
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-amber-300/60"
            >
              <Vote className="h-4 w-4" />
              Vote now
            </Link>
            <Link
              href="/training"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/60"
            >
              <BookOpen className="h-4 w-4" />
              Training rewards
            </Link>
          </div>
        </div>

        <div className="grid gap-px bg-gray-800/60 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-gray-950 p-5">
              <div className="mb-4 flex items-center justify-between">
                <metric.icon className={cn("h-5 w-5", metric.color)} />
                <span className="text-xs text-gray-500">{metric.caption}</span>
              </div>
              <p className="text-sm text-gray-400">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <GlassCard className="rounded-lg">
        <CardHeader
          title="Ecosystem Map"
          description="How project demand, ESG evidence, and TUT token rails connect."
          action={<Badge variant="info">TCCG / ESG / TUT</Badge>}
        />
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {ecosystemMapNodes.map(({ label, status, detail, icon: Icon, color, border }) => (
              <div key={label} className={cn("rounded-lg border bg-gray-950/60 p-4", border)}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Icon className={cn("h-5 w-5", color)} />
                  <span className="rounded-full border border-gray-800 px-2 py-0.5 text-xs text-gray-500">
                    {status}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-white">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {ecosystemMapFlows.map((flow) => (
              <div key={`${flow.from}-${flow.to}`} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <span>{flow.from}</span>
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                  <span>{flow.to}</span>
                </div>
                <p className="text-sm leading-6 text-gray-400">{flow.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-400/20 bg-amber-950/15 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold text-white">Operating boundary</p>
            </div>
            <p className="text-sm leading-6 text-gray-300">
              TCCG.work, ESG, and smart HVAC records can feed evidence and governance context; token
              balances, reward execution, conversion, staking, and sTUT status stay DAO-owned.
            </p>
          </div>
        </CardContent>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <GlassCard className="rounded-lg">
          <CardHeader
            title="Governance Queue"
            description="Proposal states, vote readiness, and delegation status."
            action={<Badge variant={proposalCounts.active ? "info" : "default"}>{proposalCounts.active} active</Badge>}
          />
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-5">
              {queueStates.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="border-l border-gray-800 pl-3">
                  <Icon className={cn("mb-3 h-4 w-4", color)} />
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-gray-800 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Proposal threshold readiness</p>
                  <p className="text-xs text-gray-500">
                    {formatTut(votingPower)} of {formatTut(proposalThreshold)}
                  </p>
                </div>
                <Badge variant={thresholdProgress >= 100 ? "success" : "warning"}>
                  {thresholdProgress.toFixed(0)}%
                </Badge>
              </div>
              <ProgressBar value={thresholdProgress} variant={thresholdProgress >= 100 ? "success" : "warning"} />
            </div>

            <div className="grid gap-3 border-t border-gray-800 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Wallet delegation</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {hasDelegated
                    ? isSelfDelegated
                      ? "Self delegated"
                      : `Delegated to ${delegate ? formatAddress(delegate) : "delegate"}`
                    : "No delegate set"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Proposal feed</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {proposalsLoading ? "Syncing on-chain events" : `${proposals.length} recent proposals`}
                </p>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="rounded-lg">
          <CardHeader title="Execution Readiness" description="Core contracts and reward rails." />
          <CardContent className="space-y-5">
            {readiness.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-800 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-5 w-5", item.tone)} />
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.value}</p>
                  </div>
                </div>
                <Badge variant={item.value === "Not configured" ? "warning" : "success"}>
                  {item.value === "Not configured" ? "Needs setup" : "Ready"}
                </Badge>
              </div>
            ))}

            <div className="rounded-lg border border-cyan-400/20 bg-cyan-950/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-semibold text-white">DAO administration path</p>
              </div>
              <p className="text-sm leading-6 text-gray-300">
                Tolani DAO should administer TUT reward permissions, while Tolani Labs owns course
                delivery, completion evidence, and training partner workflows.
              </p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ActivityChart data={activityData} />
        <ParticipationChart data={participationData} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {laneCards.map((lane) => (
          <Link
            key={lane.title}
            href={lane.href}
            className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 transition hover:border-cyan-400/40 hover:bg-gray-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className={cn("h-1 w-10 rounded-full", lane.rail)} />
              <ArrowRight className="h-4 w-4 text-gray-500 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
            </div>
            <lane.icon className={cn("mb-4 h-6 w-6", lane.accent)} />
            <h2 className="text-base font-semibold text-white">{lane.title}</h2>
            <p className="mt-1 text-xs uppercase text-gray-500">{lane.status}</p>
            <p className="mt-3 text-sm leading-6 text-gray-400">{lane.detail}</p>
          </Link>
        ))}
      </div>

      <GlassCard className="rounded-lg">
        <CardHeader
          title="Recent Proposal Stream"
          description="Newest proposal events from the connected governor contract."
          action={
            <Link href="/proposals" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
              View all
            </Link>
          }
        />
        <CardContent className="space-y-3">
          {proposals.length ? (
            proposals.slice(0, 5).map((proposal) => (
              <Link
                key={proposal.proposalId}
                href={`/proposals/detail?id=${proposal.proposalId}`}
                className="grid gap-3 border-b border-gray-800 pb-4 transition last:border-b-0 last:pb-0 hover:border-cyan-400/30 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={proposalBadgeVariant(proposal.stateNum)}>{proposal.state}</Badge>
                    <span className="text-xs text-gray-500">{proposal.category}</span>
                  </div>
                  <h3 className="font-medium text-white">{proposal.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">Proposed by {formatAddress(proposal.proposer)}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-medium text-white">
                    {formatTut(
                      toFiniteNumber(proposal.forVotesFormatted) +
                        toFiniteNumber(proposal.againstVotesFormatted) +
                        toFiniteNumber(proposal.abstainVotesFormatted)
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">total voting weight</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-white">No recent proposals found</p>
                <p className="mt-1 text-sm text-gray-500">
                  The dashboard is ready; proposals will populate once governor events are indexed.
                </p>
              </div>
              <LineChart className="h-8 w-8 text-cyan-300" />
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
}
