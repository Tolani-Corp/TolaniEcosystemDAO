"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Filter, ThumbsUp, ThumbsDown, MinusCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { cn, formatAddress, getProposalStateColor, getTimeRemaining } from "@/lib/utils";

interface VotableProposal {
  id: string;
  title: string;
  state: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  deadline: Date;
  hasVoted: boolean;
  userVote?: number;
}

const mockVotableProposals: VotableProposal[] = [
  {
    id: "0x1234567890abcdef",
    title: "TIP-12: Increase Treasury Allocation for Development",
    state: "Active",
    forVotes: 125000,
    againstVotes: 45000,
    abstainVotes: 8000,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    hasVoted: false,
  },
  {
    id: "0xabcdef1234567890",
    title: "TIP-13: Community Grants Program Q1 2025",
    state: "Active",
    forVotes: 85000,
    againstVotes: 12000,
    abstainVotes: 3000,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    hasVoted: true,
    userVote: 1,
  },
  {
    id: "0x567890abcdef1234",
    title: "TIP-14: Protocol Parameter Update",
    state: "Active",
    forVotes: 45000,
    againstVotes: 55000,
    abstainVotes: 8000,
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    hasVoted: false,
  },
];

export default function VotePage() {
  const [filter, setFilter] = useState<"all" | "pending" | "voted">("all");

  const filteredProposals = mockVotableProposals.filter((p) => {
    if (filter === "pending") return !p.hasVoted;
    if (filter === "voted") return p.hasVoted;
    return true;
  });

  const handleVote = async (proposalId: string, support: number) => {
    console.log("Voting:", proposalId, support);
    // TODO: Implement voting
  };

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
            <h2 className="text-4xl font-bold text-white">0 TUT</h2>
            <p className="text-sm text-gray-400 mt-2">
              Connect wallet to see your voting power
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/delegates">
              <Button variant="secondary">Delegate Votes</Button>
            </Link>
            <Button>Get TUT</Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { label: "All Proposals", value: "all" },
          { label: "Pending Vote", value: "pending" },
          { label: "Already Voted", value: "voted" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              filter === tab.value
                ? "bg-violet-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Voting Cards */}
      <div className="space-y-6">
        {filteredProposals.map((proposal, index) => {
          const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
          const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
          const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

          return (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Proposal Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          className={cn(
                            "border",
                            getProposalStateColor(proposal.state)
                          )}
                        >
                          {proposal.state}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          #{proposal.id.slice(0, 8)}
                        </span>
                      </div>
                      <Link href={`/proposals/${proposal.id}`}>
                        <h3 className="text-xl font-semibold text-white hover:text-violet-400 transition-colors mb-4">
                          {proposal.title}
                        </h3>
                      </Link>

                      {/* Voting Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">For</span>
                          </div>
                          <span className="text-green-400">
                            {forPercentage.toFixed(1)}% ({proposal.forVotes.toLocaleString()})
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <div className="flex h-full">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                              style={{ width: `${forPercentage}%` }}
                            />
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-pink-500"
                              style={{ width: `${againstPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="w-4 h-4 text-red-400" />
                            <span className="text-gray-300">Against</span>
                          </div>
                          <span className="text-red-400">
                            {againstPercentage.toFixed(1)}% ({proposal.againstVotes.toLocaleString()})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800/50">
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          {getTimeRemaining(proposal.deadline)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {totalVotes.toLocaleString()} total votes
                        </div>
                      </div>
                    </div>

                    {/* Vote Actions */}
                    <div className="lg:w-64 lg:border-l lg:border-gray-800/50 lg:pl-6">
                      {proposal.hasVoted ? (
                        <div className="text-center py-4">
                          <div
                            className={cn(
                              "inline-flex items-center justify-center w-16 h-16 rounded-full mb-3",
                              proposal.userVote === 1
                                ? "bg-green-500/20"
                                : proposal.userVote === 0
                                ? "bg-red-500/20"
                                : "bg-gray-500/20"
                            )}
                          >
                            {proposal.userVote === 1 ? (
                              <ThumbsUp className="w-8 h-8 text-green-400" />
                            ) : proposal.userVote === 0 ? (
                              <ThumbsDown className="w-8 h-8 text-red-400" />
                            ) : (
                              <MinusCircle className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <p className="text-white font-medium">
                            You voted{" "}
                            {proposal.userVote === 1
                              ? "For"
                              : proposal.userVote === 0
                              ? "Against"
                              : "Abstain"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Vote recorded on-chain
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-400 mb-4">
                            Cast your vote
                          </p>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-500"
                            onClick={() => handleVote(proposal.id, 1)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Vote For
                          </Button>
                          <Button
                            className="w-full bg-red-600 hover:bg-red-500"
                            onClick={() => handleVote(proposal.id, 0)}
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Vote Against
                          </Button>
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => handleVote(proposal.id, 2)}
                          >
                            <MinusCircle className="w-4 h-4 mr-2" />
                            Abstain
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {filteredProposals.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <ThumbsUp className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === "pending"
              ? "All caught up!"
              : filter === "voted"
              ? "No votes yet"
              : "No active proposals"}
          </h3>
          <p className="text-gray-400">
            {filter === "pending"
              ? "You've voted on all active proposals."
              : filter === "voted"
              ? "You haven't voted on any proposals yet."
              : "There are no active proposals to vote on."}
          </p>
        </div>
      )}
    </div>
  );
}
