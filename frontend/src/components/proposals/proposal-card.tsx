"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Clock, Users, CheckCircle2, XCircle } from "lucide-react";
import { Badge, ProgressBar } from "@/components/ui/button";
import { cn, getProposalStateColor, getTimeRemaining, formatAddress } from "@/lib/utils";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  state: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  deadline: Date;
  createdAt: Date;
}

interface ProposalCardProps {
  proposal: Proposal;
  index: number;
}

export function ProposalCard({ proposal, index }: ProposalCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const quorumReached = totalVotes >= proposal.quorum;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link href={`/proposals/${proposal.id}`}>
        <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6 backdrop-blur-sm hover:border-violet-500/30 transition-all duration-200">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={cn(
                    "border",
                    getProposalStateColor(proposal.state)
                  )}
                >
                  {proposal.state}
                </Badge>
                <span className="text-xs text-gray-500">#{proposal.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors line-clamp-2">
                {proposal.title}
              </h3>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-violet-400 transition-colors" />
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {proposal.description}
          </p>

          {/* Voting Progress */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">For</span>
              <span className="ml-auto text-sm font-medium text-green-400">
                {forPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="flex h-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${forPercentage}%` }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${againstPercentage}%` }}
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">Against</span>
              <span className="ml-auto text-sm font-medium text-red-400">
                {againstPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" />
                <span>{totalVotes.toLocaleString()} votes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{getTimeRemaining(proposal.deadline)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {quorumReached ? (
                <Badge variant="success">Quorum ✓</Badge>
              ) : (
                <Badge variant="warning">
                  {((totalVotes / proposal.quorum) * 100).toFixed(0)}% Quorum
                </Badge>
              )}
            </div>
          </div>

          {/* Proposer */}
          <div className="mt-3 pt-3 border-t border-gray-800/30">
            <span className="text-xs text-gray-500">
              Proposed by{" "}
              <span className="text-violet-400">{formatAddress(proposal.proposer)}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProposalCardSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="w-20 h-5 bg-gray-800 rounded-full" />
          <div className="w-64 h-6 bg-gray-800 rounded-lg" />
        </div>
      </div>
      <div className="w-full h-4 bg-gray-800 rounded-lg mb-4" />
      <div className="space-y-3 mb-4">
        <div className="w-full h-2 bg-gray-800 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
        <div className="flex gap-4">
          <div className="w-20 h-4 bg-gray-800 rounded-lg" />
          <div className="w-24 h-4 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
