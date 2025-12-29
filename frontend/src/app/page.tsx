"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Vote,
  Vault,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { StatCard, GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { Button, Badge } from "@/components/ui/button";
import { ProposalCard, type Proposal } from "@/components/proposals/proposal-card";
import { ActivityChart, ParticipationChart } from "@/components/dashboard/activity-charts";
import { formatNumber } from "@/lib/utils";

// Mock data - replace with actual contract calls
const mockStats = {
  activeProposals: 3,
  totalVotes: 45230,
  treasuryValue: 2450000,
  totalDelegates: 156,
};

const mockProposals: Proposal[] = [
  {
    id: "0x1234567890abcdef",
    title: "TIP-12: Increase Treasury Allocation for Development",
    description: "This proposal seeks to allocate 15% of treasury funds towards core protocol development and ecosystem growth initiatives.",
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
    description: "Establish a community grants program to fund innovative projects building on the Tolani ecosystem.",
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
    description: "Adjust protocol fee structure to better align incentives and ensure long-term sustainability.",
    proposer: "0x567890abcdef1234567890abcdef1234567890ab",
    state: "Succeeded",
    forVotes: 230000,
    againstVotes: 15000,
    abstainVotes: 5000,
    quorum: 100000,
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
];

const mockActivityData = [
  { date: "Jan", proposals: 5, votes: 12500, participation: 65 },
  { date: "Feb", proposals: 8, votes: 18200, participation: 72 },
  { date: "Mar", proposals: 6, votes: 15800, participation: 68 },
  { date: "Apr", proposals: 12, votes: 28400, participation: 78 },
  { date: "May", proposals: 9, votes: 22100, participation: 71 },
  { date: "Jun", proposals: 11, votes: 31500, participation: 82 },
];

const mockParticipationData = [
  { month: "Jan", rate: 65 },
  { month: "Feb", rate: 72 },
  { month: "Mar", rate: 68 },
  { month: "Apr", rate: 78 },
  { month: "May", rate: 71 },
  { month: "Jun", rate: 82 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-8"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="info" className="bg-violet-500/20 text-violet-300 border-violet-500/30">
              <Zap className="w-3 h-3 mr-1" />
              Live Governance
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to Tolani Ecosystem DAO
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mb-6">
            Shape the future of decentralized governance. Vote on proposals, delegate your voting power, and participate in key decisions that drive the ecosystem forward.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/proposals">
              <Button size="lg">
                View Proposals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/delegates">
              <Button variant="secondary" size="lg">
                <Users className="w-4 h-4 mr-2" />
                Browse Delegates
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Proposals"
          value={mockStats.activeProposals.toString()}
          change="+2 this week"
          changeType="positive"
          icon={FileText}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          title="Total Votes Cast"
          value={formatNumber(mockStats.totalVotes)}
          change="+12.5%"
          changeType="positive"
          icon={Vote}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Treasury Value"
          value={`$${formatNumber(mockStats.treasuryValue)}`}
          change="+8.3%"
          changeType="positive"
          icon={Vault}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="Active Delegates"
          value={mockStats.totalDelegates.toString()}
          change="+23 this month"
          changeType="positive"
          icon={Users}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
              <FileText className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Create Proposal</h3>
              <p className="text-sm text-gray-400">Submit a new governance proposal</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Requires 100,000 TUT voting power
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Delegate Votes</h3>
              <p className="text-sm text-gray-400">Assign your voting power</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Maximize your governance impact
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Claim Rewards</h3>
              <p className="text-sm text-gray-400">Earn for participation</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            0 TUT available to claim
          </p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart data={mockActivityData} />
        <ParticipationChart data={mockParticipationData} />
      </div>

      {/* Active Proposals */}
      <GlassCard>
        <CardHeader
          title="Active Proposals"
          description="Vote on these proposals to shape the future of Tolani"
          action={
            <Link href="/proposals">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          }
        />
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockProposals.map((proposal, index) => (
            <ProposalCard key={proposal.id} proposal={proposal} index={index} />
          ))}
        </CardContent>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard>
        <CardHeader
          title="Recent Activity"
          description="Latest governance actions"
        />
        <CardContent>
          <div className="space-y-4">
            {[
              {
                type: "vote",
                user: "0x1234...5678",
                action: "voted For on",
                target: "TIP-12",
                time: "2 hours ago",
                icon: Vote,
                color: "text-green-400",
              },
              {
                type: "delegate",
                user: "0xabcd...ef12",
                action: "delegated 50,000 TUT to",
                target: "delegate.eth",
                time: "5 hours ago",
                icon: Users,
                color: "text-blue-400",
              },
              {
                type: "proposal",
                user: "0x5678...9abc",
                action: "created proposal",
                target: "TIP-13",
                time: "1 day ago",
                icon: FileText,
                color: "text-violet-400",
              },
              {
                type: "execute",
                user: "Timelock",
                action: "executed",
                target: "TIP-10",
                time: "2 days ago",
                icon: TrendingUp,
                color: "text-emerald-400",
              },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-gray-800/50 ${activity.color}`}>
                  <activity.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">
                    <span className="text-violet-400">{activity.user}</span>{" "}
                    {activity.action}{" "}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
