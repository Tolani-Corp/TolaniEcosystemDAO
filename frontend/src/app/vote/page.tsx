"use client";

import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, MinusCircle, Vote, Users, FileText, Loader2, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { cn, formatNumber, formatAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import { useVotingPower, useDelegate } from "@/hooks/useGovernance";
import { useActiveProposals, type Proposal } from "@/hooks/useProposals";

export default function VotePage() {
  const { isConnected } = useAccount();
  const { votingPowerFormatted, isLoading: votingLoading } = useVotingPower();
  const { hasDelegated, isSelfDelegated } = useDelegate();
  const { proposals: activeProposals, isLoading: proposalsLoading, error } = useActiveProposals();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Vote</h1>
        <p className="text-gray-400 mt-1">
          Cast your vote on active governance proposals
        </p>
      </div>

      {/* Voting Power Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Your Voting Power</p>
            {votingLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                <span className="text-2xl text-gray-400">Loading...</span>
              </div>
            ) : (
              <h2 className="text-4xl font-bold text-white">
                {formatNumber(parseFloat(votingPowerFormatted))} TUT
              </h2>
            )}
            {isConnected && !hasDelegated && (
              <p className="text-sm text-yellow-400 mt-2">
                ⚠️ You need to delegate to yourself to activate voting power
              </p>
            )}
            {isConnected && hasDelegated === true && (
              <p className="text-sm text-green-400 mt-2">
                ✓ {isSelfDelegated ? "Self-delegated" : "Delegated"} - Ready to vote
              </p>
            )}
            {!isConnected && (
              <p className="text-sm text-gray-400 mt-2">
                Connect wallet to see your voting power
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/delegates">
              <Button variant="secondary">Delegate Votes</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Voting Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20">
                <ThumbsUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Vote For</h3>
            </div>
            <p className="text-sm text-gray-400">
              Support the proposal. Your voting power counts toward passing it.
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <ThumbsDown className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-white">Vote Against</h3>
            </div>
            <p className="text-sm text-gray-400">
              Oppose the proposal. Your voting power counts against passing it.
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-500/20">
                <MinusCircle className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="font-semibold text-white">Abstain</h3>
            </div>
            <p className="text-sm text-gray-400">
              Participate without taking a side. Counts toward quorum but not outcome.
            </p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Active Proposals */}
      <GlassCard>
        <CardHeader
          title="Active Proposals"
          description="Proposals available for voting"
        />
        <CardContent>
          {proposalsLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading active proposals...</p>
            </div>
          ) : activeProposals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Vote className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No Active Proposals
              </h3>
              <p className="text-gray-400 max-w-sm mx-auto mb-6">
                There are currently no proposals in the active voting period. Check back later or create a new proposal.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/proposals/create">
                  <Button>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                </Link>
                <Link href="/proposals">
                  <Button variant="secondary">
                    View All Proposals
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeProposals.map((proposal) => {
                const totalVotes = parseFloat(proposal.forVotesFormatted) + parseFloat(proposal.againstVotesFormatted) + parseFloat(proposal.abstainVotesFormatted);
                const forPercent = totalVotes > 0 ? (parseFloat(proposal.forVotesFormatted) / totalVotes) * 100 : 0;
                const againstPercent = totalVotes > 0 ? (parseFloat(proposal.againstVotesFormatted) / totalVotes) * 100 : 0;

                return (
                  <Link key={proposal.proposalId} href={`/proposals/detail?id=${proposal.proposalId}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="p-6 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-green-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-green-500/20 text-green-400 border-0">
                              <Vote className="w-3 h-3 mr-1" />
                              Active
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
                        <Button size="sm">
                          Vote Now
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      {/* Vote Progress */}
                      {totalVotes > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>For: {formatNumber(parseFloat(proposal.forVotesFormatted))} TUT ({forPercent.toFixed(1)}%)</span>
                            <span>Against: {formatNumber(parseFloat(proposal.againstVotesFormatted))} TUT ({againstPercent.toFixed(1)}%)</span>
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
              })}
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Voting Process Info */}
      <GlassCard>
        <CardHeader
          title="Voting Process"
          description="How governance voting works"
        />
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-violet-400 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Proposal Created</h4>
                <p className="text-sm text-gray-400">
                  Anyone with enough voting power can create a proposal. There's a short delay before voting begins.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Voting Period</h4>
                <p className="text-sm text-gray-400">
                  Token holders can vote For, Against, or Abstain. The voting period lasts for a set number of blocks.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Execution</h4>
                <p className="text-sm text-gray-400">
                  If quorum is met and more votes are For than Against, the proposal is queued and then executed via the Timelock.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Requirements */}
      <GlassCard>
        <CardHeader
          title="Requirements"
          description="What you need to participate"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-gray-800/30">
              <h4 className="font-medium text-white mb-2">To Vote</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Hold TUT tokens
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Delegate to yourself or another address
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Vote during active voting period
                </li>
              </ul>
            </div>
            
            <div className="p-4 rounded-xl bg-gray-800/30">
              <h4 className="font-medium text-white mb-2">To Create Proposals</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Meet proposal threshold (voting power)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Provide proposal details and on-chain actions
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Pay gas fees for transaction
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
