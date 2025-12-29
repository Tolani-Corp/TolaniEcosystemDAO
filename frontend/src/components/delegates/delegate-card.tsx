"use client";

import { motion } from "framer-motion";
import { formatAddress, formatNumber } from "@/lib/utils";
import { ExternalLink, Award, TrendingUp } from "lucide-react";
import { Button, Badge } from "@/components/ui/button";

export interface Delegate {
  address: string;
  ensName?: string;
  votingPower: number;
  delegators: number;
  proposalsVoted: number;
  participationRate: number;
  statement?: string;
}

interface DelegateCardProps {
  delegate: Delegate;
  rank: number;
  onDelegate: (address: string) => void;
}

export function DelegateCard({ delegate, rank, onDelegate }: DelegateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6 backdrop-blur-sm hover:border-violet-500/30 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {delegate.ensName?.[0]?.toUpperCase() || delegate.address[2].toUpperCase()}
              </span>
            </div>
            {rank <= 3 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                <Award className="w-3 h-3 text-yellow-900" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">
                {delegate.ensName || formatAddress(delegate.address)}
              </h3>
              <a
                href={`https://etherscan.io/address/${delegate.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-violet-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-sm text-gray-400">Rank #{rank}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onDelegate(delegate.address)}>
          Delegate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-xl bg-gray-800/30">
          <p className="text-xs text-gray-400 mb-1">Voting Power</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span className="font-semibold text-white">
              {formatNumber(delegate.votingPower)}
            </span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-gray-800/30">
          <p className="text-xs text-gray-400 mb-1">Delegators</p>
          <span className="font-semibold text-white">{delegate.delegators}</span>
        </div>
        <div className="p-3 rounded-xl bg-gray-800/30">
          <p className="text-xs text-gray-400 mb-1">Proposals Voted</p>
          <span className="font-semibold text-white">{delegate.proposalsVoted}</span>
        </div>
        <div className="p-3 rounded-xl bg-gray-800/30">
          <p className="text-xs text-gray-400 mb-1">Participation</p>
          <span className="font-semibold text-white">
            {delegate.participationRate}%
          </span>
        </div>
      </div>

      {/* Statement */}
      {delegate.statement && (
        <div className="pt-4 border-t border-gray-800/50">
          <p className="text-sm text-gray-400 line-clamp-3">{delegate.statement}</p>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-4">
        {delegate.participationRate >= 90 && (
          <Badge variant="success">Active Voter</Badge>
        )}
        {delegate.delegators >= 100 && (
          <Badge variant="info">Top Delegate</Badge>
        )}
        {rank <= 10 && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Top 10
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

export function DelegateCardSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-800" />
        <div className="flex-1">
          <div className="w-32 h-5 bg-gray-800 rounded-lg mb-2" />
          <div className="w-20 h-4 bg-gray-800 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 rounded-xl bg-gray-800/30">
            <div className="w-16 h-3 bg-gray-800 rounded mb-2" />
            <div className="w-12 h-5 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
