"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Vote,
  Vault,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  Shield,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { StatCard, GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { Button, Badge } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "wagmi";
import { 
  useVotingPower, 
  useTokenBalance, 
  useGovernorParams,
  useQuorum,
} from "@/hooks/useGovernance";
import { useTreasuryStats, useEcosystemValue } from "@/hooks/useTreasury";

function StatCardLoading({ title, icon: Icon, gradient }: { title: string; icon: React.ElementType; gradient: string }) {
  return (
    <div className={`${gradient} rounded-2xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">{title}</p>
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <span className="text-white/50">Loading...</span>
          </div>
        </div>
        <div className="p-3 bg-white/10 rounded-xl">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { votingPowerFormatted, isLoading: votingLoading } = useVotingPower();
  const { balanceFormatted, isLoading: balanceLoading } = useTokenBalance();
  const { proposalThresholdFormatted } = useGovernorParams();
  const { quorumFormatted } = useQuorum();
  const treasuryStats = useTreasuryStats();
  const ecosystemValue = useEcosystemValue();

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
              Live on Sepolia
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
                Delegate Votes
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* User Stats (if connected) */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <GlassCard>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-500/20">
                  <Vault className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Your TUT Balance</p>
                  {balanceLoading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(parseFloat(balanceFormatted))} TUT
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Vote className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Your Voting Power</p>
                  {votingLoading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(parseFloat(votingPowerFormatted))} TUT
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <FileText className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Proposal Threshold</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(parseFloat(proposalThresholdFormatted))} TUT
                  </p>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      )}

      {/* Protocol Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {treasuryStats.isLoading ? (
          <>
            <StatCardLoading title="Treasury ETH" icon={Vault} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
            <StatCardLoading title="Treasury TUT" icon={Vault} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          </>
        ) : (
          <>
            <StatCard
              title="Treasury ETH"
              value={`${parseFloat(treasuryStats.ethBalanceFormatted).toFixed(4)} ETH`}
              change="On-chain balance"
              changeType="neutral"
              icon={Vault}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <StatCard
              title="Treasury TUT"
              value={formatNumber(parseFloat(treasuryStats.tokenBalanceFormatted))}
              change="On-chain balance"
              changeType="neutral"
              icon={Vault}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
          </>
        )}
        <StatCard
          title="Quorum Needed"
          value={formatNumber(parseFloat(quorumFormatted))}
          change="TUT votes required"
          changeType="neutral"
          icon={Users}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="Ecosystem Value"
          value={`${formatNumber(parseFloat(ecosystemValue.totalTokensFormatted))} TUT`}
          change="Total across contracts"
          changeType="neutral"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/proposals/create">
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
              Requires {formatNumber(parseFloat(proposalThresholdFormatted))} TUT voting power
            </p>
          </motion.div>
        </Link>

        <Link href="/delegates">
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
        </Link>

        <Link href="/vote">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 cursor-pointer group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Cast Vote</h3>
                <p className="text-sm text-gray-400">Vote on active proposals</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {isConnected ? `${formatNumber(parseFloat(votingPowerFormatted))} TUT voting power` : 'Connect wallet to vote'}
            </p>
          </motion.div>
        </Link>
      </div>

      {/* Charts Section - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <CardHeader
            title="Governance Activity"
            description="Historical data requires indexer integration"
          />
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Activity charts will populate as governance events occur</p>
              <p className="text-sm mt-2 text-gray-500">Requires subgraph or event indexer</p>
            </div>
          </CardContent>
        </GlassCard>
        
        <GlassCard>
          <CardHeader
            title="Participation Metrics"
            description="Real-time voting participation data"
          />
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Participation data will appear after first proposal</p>
              <p className="text-sm mt-2 text-gray-500">Create a proposal to get started</p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Active Proposals - Empty State */}
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
        <CardContent className="py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Active Proposals
            </h3>
            <p className="text-gray-400 max-w-sm mx-auto mb-6">
              Be the first to create a governance proposal and shape the future of the ecosystem.
            </p>
            <Link href="/proposals/create">
              <Button>
                Create First Proposal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </GlassCard>

      {/* Contract Info */}
      <GlassCard>
        <CardHeader
          title="Contract Information"
          description="Deployed ecosystem contracts on Sepolia"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Governor', address: '0xD360...4607' },
              { name: 'Timelock', address: '0xf475...591C' },
              { name: 'Treasury', address: '0xC120...28F7' },
              { name: 'Token', address: '0x6D07...2eFb' },
              { name: 'Escrow', address: '0x8be1...faFd' },
              { name: 'Payroll', address: '0x4d8F...13dC' },
              { name: 'Compliance', address: '0xE253...6298' },
              { name: 'ESG', address: '0x7Eb4...0867' },
            ].map((contract) => (
              <div key={contract.name} className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                <p className="text-sm text-gray-400">{contract.name}</p>
                <p className="text-white font-mono text-sm">{contract.address}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
