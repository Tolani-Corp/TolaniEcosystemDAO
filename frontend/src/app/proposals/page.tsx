"use client";

import { motion } from "framer-motion";
import { Plus, FileText, Vote, Users, ArrowRight, Loader2, Clock, CheckCircle, XCircle, AlertTriangle, Timer, Play } from "lucide-react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { useAccount } from "wagmi";
import { useVotingPower, useGovernorParams } from "@/hooks/useGovernance";
import { useProposals, type Proposal } from "@/hooks/useProposals";
import { formatNumber, formatAddress, cn } from "@/lib/utils";

// State colors and icons
const stateConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
  Pending: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", icon: Clock },
  Active: { color: "text-green-400", bgColor: "bg-green-500/20", icon: Vote },
  Canceled: { color: "text-gray-400", bgColor: "bg-gray-500/20", icon: XCircle },
  Defeated: { color: "text-red-400", bgColor: "bg-red-500/20", icon: XCircle },
  Succeeded: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircle },
  Queued: { color: "text-blue-400", bgColor: "bg-blue-500/20", icon: Timer },
  Expired: { color: "text-orange-400", bgColor: "bg-orange-500/20", icon: AlertTriangle },
  Executed: { color: "text-violet-400", bgColor: "bg-violet-500/20", icon: Play },
};

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const config = stateConfig[proposal.state] || stateConfig.Pending;
  const StateIcon = config.icon;
  
  const totalVotes = parseFloat(proposal.forVotesFormatted) + parseFloat(proposal.againstVotesFormatted) + parseFloat(proposal.abstainVotesFormatted);
  const forPercent = totalVotes > 0 ? (parseFloat(proposal.forVotesFormatted) / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (parseFloat(proposal.againstVotesFormatted) / totalVotes) * 100 : 0;

  return (
    <Link href={`/proposals/detail?id=${proposal.proposalId}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="p-6 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-violet-500/30 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn(config.bgColor, config.color, "border-0")}>
                <StateIcon className="w-3 h-3 mr-1" />
                {proposal.state}
              </Badge>
              <span className="text-xs text-gray-500">
                {proposal.createdAt.toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 truncate">
              {proposal.title}
            </h3>
            <p className="text-sm text-gray-400">
              Proposed by {formatAddress(proposal.proposer)}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
        </div>

        {/* Vote Progress */}
        {totalVotes > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>For: {formatNumber(parseFloat(proposal.forVotesFormatted))} TUT</span>
              <span>Against: {formatNumber(parseFloat(proposal.againstVotesFormatted))} TUT</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 transition-all"
                style={{ width: `${forPercent}%` }}
              />
              <div 
                className="bg-red-500 transition-all"
                style={{ width: `${againstPercent}%` }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}

function EmptyState({ proposalThresholdFormatted }: { proposalThresholdFormatted: string }) {
  return (
    <GlassCard>
      <CardContent className="py-20">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <FileText className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            No Proposals Yet
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            Be the first to create a governance proposal for the Tolani Ecosystem DAO. 
            Shape the future of decentralized governance.
          </p>
          <Link href="/proposals/create">
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create First Proposal
            </Button>
          </Link>
        </div>
      </CardContent>
    </GlassCard>
  );
}

export default function ProposalsPage() {
  const { isConnected } = useAccount();
  const { votingPowerFormatted } = useVotingPower();
  const { proposalThresholdFormatted } = useGovernorParams();
  const { proposals, isLoading, error, refetch } = useProposals();

  const hasEnoughVotingPower = parseFloat(votingPowerFormatted) >= parseFloat(proposalThresholdFormatted);

  // Group proposals by state
  const activeProposals = proposals.filter(p => p.stateNum === 1);
  const pendingProposals = proposals.filter(p => p.stateNum === 0);
  const succeededProposals = proposals.filter(p => p.stateNum === 4);
  const queuedProposals = proposals.filter(p => p.stateNum === 5);
  const completedProposals = proposals.filter(p => [2, 3, 6, 7].includes(p.stateNum));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Proposals</h1>
          <p className="text-gray-400 mt-1">
            Browse and vote on governance proposals
          </p>
        </div>
        <Link href="/proposals/create">
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </Link>
      </div>

      {/* User Voting Power */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Your Voting Power</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(parseFloat(votingPowerFormatted))} TUT
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Proposal Threshold</p>
              <p className="text-lg font-semibold text-white">
                {formatNumber(parseFloat(proposalThresholdFormatted))} TUT
              </p>
              {hasEnoughVotingPower ? (
                <p className="text-xs text-green-400 mt-1">✓ You can create proposals</p>
              ) : (
                <p className="text-xs text-yellow-400 mt-1">⚠️ Need more voting power</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading proposals from blockchain...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Error loading proposals</p>
              <p className="text-sm text-gray-400">{error.message}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
            Try Again
          </Button>
        </div>
      )}

      {/* Proposals List */}
      {!isLoading && !error && (
        <>
          {proposals.length === 0 ? (
            <EmptyState proposalThresholdFormatted={proposalThresholdFormatted} />
          ) : (
            <div className="space-y-8">
              {/* Active Proposals */}
              {activeProposals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Vote className="w-5 h-5 text-green-400" />
                    Active Voting ({activeProposals.length})
                  </h2>
                  <div className="space-y-4">
                    {activeProposals.map(proposal => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Proposals */}
              {pendingProposals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Pending ({pendingProposals.length})
                  </h2>
                  <div className="space-y-4">
                    {pendingProposals.map(proposal => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Succeeded - Ready to Queue */}
              {succeededProposals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Succeeded - Ready to Queue ({succeededProposals.length})
                  </h2>
                  <div className="space-y-4">
                    {succeededProposals.map(proposal => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Queued - Ready to Execute */}
              {queuedProposals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Timer className="w-5 h-5 text-blue-400" />
                    Queued - In Timelock ({queuedProposals.length})
                  </h2>
                  <div className="space-y-4">
                    {queuedProposals.map(proposal => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Proposals */}
              {completedProposals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    Completed ({completedProposals.length})
                  </h2>
                  <div className="space-y-4">
                    {completedProposals.map(proposal => (
                      <ProposalCard key={proposal.proposalId} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <CardContent className="p-6">
            <div className="p-3 rounded-xl bg-violet-500/20 w-fit mb-4">
              <FileText className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Create Proposals</h3>
            <p className="text-sm text-gray-400">
              Anyone with {formatNumber(parseFloat(proposalThresholdFormatted))} TUT voting power can submit proposals for the community to vote on.
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6">
            <div className="p-3 rounded-xl bg-blue-500/20 w-fit mb-4">
              <Vote className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Vote on Proposals</h3>
            <p className="text-sm text-gray-400">
              Token holders can vote For, Against, or Abstain on any active proposal using their delegated voting power.
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6">
            <div className="p-3 rounded-xl bg-emerald-500/20 w-fit mb-4">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Execute Proposals</h3>
            <p className="text-sm text-gray-400">
              Successful proposals are queued in the Timelock and can be executed after the delay period.
            </p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Proposal Lifecycle */}
      <GlassCard>
        <CardHeader
          title="Proposal Lifecycle"
          description="How proposals move through the governance process"
        />
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {[
              { state: "Pending", color: "yellow", desc: "Waiting for voting to begin" },
              { state: "Active", color: "green", desc: "Open for voting" },
              { state: "Succeeded", color: "emerald", desc: "Passed and ready to queue" },
              { state: "Queued", color: "blue", desc: "In timelock waiting period" },
              { state: "Executed", color: "violet", desc: "Successfully executed" },
            ].map((item, index) => (
              <div key={item.state} className="flex-1 flex items-center">
                <div className="flex-1 p-4 rounded-xl bg-gray-800/30 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 bg-${item.color}-500/20 text-${item.color}-400`}>
                    {item.state}
                  </span>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                {index < 4 && (
                  <ArrowRight className="w-4 h-4 text-gray-600 mx-2 hidden lg:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/delegates">
          <Button variant="secondary">
            <Users className="w-4 h-4 mr-2" />
            Delegate Votes
          </Button>
        </Link>
        <Link href="/vote">
          <Button variant="secondary">
            <Vote className="w-4 h-4 mr-2" />
            Voting Page
          </Button>
        </Link>
        <Link href="/treasury">
          <Button variant="secondary">
            Treasury Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
