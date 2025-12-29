"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Filter, Search, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { ProposalCard, ProposalCardSkeleton, type Proposal } from "@/components/proposals/proposal-card";
import { cn } from "@/lib/utils";

const mockProposals: Proposal[] = [
  {
    id: "0x1234567890abcdef",
    title: "TIP-12: Increase Treasury Allocation for Development",
    description: "This proposal seeks to allocate 15% of treasury funds towards core protocol development and ecosystem growth initiatives. The funds will be used for hiring developers, auditing smart contracts, and expanding infrastructure.",
    proposer: "0x1234567890123456789012345678901234567890",
    state: "Active",
    forVotes: 125000,
    againstVotes: 45000,
    abstainVotes: 8000,
    quorum: 100000,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "0xabcdef1234567890",
    title: "TIP-13: Community Grants Program Q1 2025",
    description: "Establish a community grants program to fund innovative projects building on the Tolani ecosystem. This initiative aims to foster ecosystem growth and attract new developers.",
    proposer: "0xabcdef1234567890abcdef1234567890abcdef12",
    state: "Pending",
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    quorum: 100000,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "0x567890abcdef1234",
    title: "TIP-11: Protocol Fee Adjustment",
    description: "Adjust protocol fee structure to better align incentives and ensure long-term sustainability. The new fee structure will be more favorable for active participants.",
    proposer: "0x567890abcdef1234567890abcdef1234567890ab",
    state: "Succeeded",
    forVotes: 230000,
    againstVotes: 15000,
    abstainVotes: 5000,
    quorum: 100000,
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: "0xdef1234567890abc",
    title: "TIP-10: Partnership with DeFi Protocol X",
    description: "Form a strategic partnership with Protocol X to enhance liquidity and cross-protocol integrations. This will open new opportunities for TUT holders.",
    proposer: "0xdef1234567890abcdef1234567890abcdef1234",
    state: "Executed",
    forVotes: 180000,
    againstVotes: 20000,
    abstainVotes: 10000,
    quorum: 100000,
    deadline: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
  },
  {
    id: "0x890abcdef1234567",
    title: "TIP-9: Governance Parameter Updates",
    description: "Update key governance parameters including voting period, quorum threshold, and proposal threshold to optimize decision-making efficiency.",
    proposer: "0x890abcdef1234567890abcdef1234567890abcd",
    state: "Defeated",
    forVotes: 65000,
    againstVotes: 85000,
    abstainVotes: 12000,
    quorum: 100000,
    deadline: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
  },
  {
    id: "0x234567890abcdef1",
    title: "TIP-8: Launch Ecosystem Fund",
    description: "Create a dedicated ecosystem fund to support developers, projects, and initiatives that contribute to the growth of the Tolani ecosystem.",
    proposer: "0x234567890abcdef1234567890abcdef12345678",
    state: "Queued",
    forVotes: 195000,
    againstVotes: 25000,
    abstainVotes: 8000,
    quorum: 100000,
    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

const filters = [
  { label: "All", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Pending", value: "Pending" },
  { label: "Succeeded", value: "Succeeded" },
  { label: "Queued", value: "Queued" },
  { label: "Executed", value: "Executed" },
  { label: "Defeated", value: "Defeated" },
];

export default function ProposalsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);

  const filteredProposals = mockProposals.filter((proposal) => {
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" || proposal.state === activeFilter;
    return matchesSearch && matchesFilter;
  });

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

      {/* Filters and Search */}
      <GlassCard>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    activeFilter === filter.value
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 border-l border-gray-700/50 pl-4">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === "grid"
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === "list"
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: "Total Proposals", value: mockProposals.length },
          { label: "Active", value: mockProposals.filter((p) => p.state === "Active").length },
          { label: "Pending", value: mockProposals.filter((p) => p.state === "Pending").length },
          { label: "Executed", value: mockProposals.filter((p) => p.state === "Executed").length },
        ].map((stat, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-800/50 rounded-xl"
          >
            <span className="text-gray-400 text-sm">{stat.label}:</span>
            <span className="text-white font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Proposals Grid/List */}
      {isLoading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              : "space-y-4"
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProposalCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProposals.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              : "space-y-4"
          )}
        >
          {filteredProposals.map((proposal, index) => (
            <ProposalCard key={proposal.id} proposal={proposal} index={index} />
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Filter className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No proposals found
          </h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            {searchQuery
              ? `No proposals match "${searchQuery}"`
              : "There are no proposals matching your filter criteria."}
          </p>
        </div>
      )}
    </div>
  );
}
