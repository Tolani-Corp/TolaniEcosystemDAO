"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Filter, Users, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { DelegateCard, DelegateCardSkeleton, type Delegate } from "@/components/delegates/delegate-card";
import { StatCard } from "@/components/ui/cards";
import { formatNumber, cn } from "@/lib/utils";

const mockDelegates: Delegate[] = [
  {
    address: "0x1234567890123456789012345678901234567890",
    ensName: "tolani.eth",
    votingPower: 2500000,
    delegators: 245,
    proposalsVoted: 28,
    participationRate: 96,
    statement: "Committed to sustainable growth and responsible governance. I believe in transparency and community-first decision making.",
  },
  {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    ensName: "defi-builder.eth",
    votingPower: 1850000,
    delegators: 189,
    proposalsVoted: 25,
    participationRate: 92,
    statement: "DeFi native with 5+ years experience. Focus on protocol security and sustainable tokenomics.",
  },
  {
    address: "0x567890abcdef1234567890abcdef1234567890ab",
    votingPower: 1200000,
    delegators: 156,
    proposalsVoted: 22,
    participationRate: 88,
    statement: "Long-term holder focused on ecosystem growth and strategic partnerships.",
  },
  {
    address: "0xdef1234567890abcdef1234567890abcdef1234",
    ensName: "cryptogov.eth",
    votingPower: 950000,
    delegators: 98,
    proposalsVoted: 30,
    participationRate: 100,
    statement: "Governance specialist with experience across multiple DAOs. Advocate for decentralization.",
  },
  {
    address: "0x890abcdef1234567890abcdef1234567890abcd",
    votingPower: 720000,
    delegators: 67,
    proposalsVoted: 18,
    participationRate: 85,
    statement: "Community member since day one. Focused on user experience and adoption.",
  },
  {
    address: "0x234567890abcdef1234567890abcdef12345678",
    ensName: "whale.eth",
    votingPower: 580000,
    delegators: 45,
    proposalsVoted: 15,
    participationRate: 78,
  },
];

const sortOptions = [
  { label: "Voting Power", value: "votingPower" },
  { label: "Delegators", value: "delegators" },
  { label: "Participation", value: "participationRate" },
  { label: "Proposals Voted", value: "proposalsVoted" },
];

export default function DelegatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("votingPower");
  const [isLoading, setIsLoading] = useState(false);

  const sortedDelegates = [...mockDelegates]
    .filter(
      (d) =>
        d.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ensName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const key = sortBy as keyof Delegate;
      return (b[key] as number) - (a[key] as number);
    });

  const totalVotingPower = mockDelegates.reduce((acc, d) => acc + d.votingPower, 0);
  const totalDelegators = mockDelegates.reduce((acc, d) => acc + d.delegators, 0);
  const avgParticipation =
    mockDelegates.reduce((acc, d) => acc + d.participationRate, 0) /
    mockDelegates.length;

  const handleDelegate = (address: string) => {
    console.log("Delegate to:", address);
    // TODO: Implement delegation
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Delegates</h1>
          <p className="text-gray-400 mt-1">
            Browse and delegate your voting power to trusted community members
          </p>
        </div>
        <Button>
          <Users className="w-4 h-4 mr-2" />
          Become a Delegate
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Delegates"
          value={mockDelegates.length.toString()}
          change="+12 this month"
          changeType="positive"
          icon={Users}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          title="Total Voting Power"
          value={formatNumber(totalVotingPower)}
          change="TUT delegated"
          changeType="neutral"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Total Delegators"
          value={totalDelegators.toString()}
          change="Active delegators"
          changeType="neutral"
          icon={Award}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="Avg. Participation"
          value={`${avgParticipation.toFixed(0)}%`}
          change="+3% from last month"
          changeType="positive"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Your Delegation */}
      <GlassCard>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Users className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Your Delegation Status
                </h3>
                <p className="text-gray-400">
                  You haven&apos;t delegated your voting power yet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Your Voting Power</p>
                <p className="text-2xl font-bold text-white">0 TUT</p>
              </div>
              <Button variant="secondary">Self-Delegate</Button>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Search and Sort */}
      <GlassCard>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by address or ENS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Sort by:</span>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    sortBy === option.value
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Delegates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <DelegateCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedDelegates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedDelegates.map((delegate, index) => (
            <DelegateCard
              key={delegate.address}
              delegate={delegate}
              rank={index + 1}
              onDelegate={handleDelegate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No delegates found
          </h3>
          <p className="text-gray-400">
            No delegates match your search criteria.
          </p>
        </div>
      )}
    </div>
  );
}
