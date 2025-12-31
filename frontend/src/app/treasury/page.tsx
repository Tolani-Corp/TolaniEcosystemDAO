"use client";

import { motion } from "framer-motion";
import {
  Vault,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Coins,
  DollarSign,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { StatCard, GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { Button, Badge } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { useTreasuryStats, useEscrowBalance, usePayrollBalance, useEcosystemValue } from "@/hooks/useTreasury";
import { useContracts } from "@/hooks/useContracts";

export default function TreasuryPage() {
  const contracts = useContracts();
  const treasuryStats = useTreasuryStats();
  const escrowBalance = useEscrowBalance();
  const payrollBalance = usePayrollBalance();
  const ecosystemValue = useEcosystemValue();

  const isLoading = treasuryStats.isLoading || escrowBalance.isLoading || payrollBalance.isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Treasury</h1>
          <p className="text-gray-400 mt-1">
            Real-time on-chain treasury balances
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/proposals/create">
            <Button>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Create Treasury Proposal
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-white/70">Loading...</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-white/70">Loading...</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <StatCard
              title="Treasury ETH"
              value={`${parseFloat(treasuryStats.ethBalanceFormatted).toFixed(4)} ETH`}
              change="Main treasury"
              changeType="neutral"
              icon={Coins}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <StatCard
              title="Treasury TUT"
              value={`${formatNumber(parseFloat(treasuryStats.tokenBalanceFormatted))} TUT`}
              change="Token reserves"
              changeType="neutral"
              icon={Vault}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
          </>
        )}
        <StatCard
          title="Escrow Held"
          value={`${formatNumber(parseFloat(escrowBalance.tokenBalanceFormatted))} TUT`}
          change="In escrow contracts"
          changeType="neutral"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="Ecosystem Total"
          value={`${formatNumber(parseFloat(ecosystemValue.totalTokensFormatted))} TUT`}
          change="All contracts combined"
          changeType="neutral"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Contract Balances Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Holdings */}
        <GlassCard>
          <CardHeader
            title="Contract Balances"
            description="Token holdings across ecosystem contracts"
          />
          <CardContent className="space-y-4">
            <BalanceRow
              name="Treasury"
              address={contracts.treasury.address}
              tutBalance={treasuryStats.tokenBalanceFormatted}
              ethBalance={treasuryStats.ethBalanceFormatted}
              isLoading={treasuryStats.isLoading}
            />
            <BalanceRow
              name="Escrow"
              address={contracts.escrow.address}
              tutBalance={escrowBalance.tokenBalanceFormatted}
              ethBalance={escrowBalance.ethBalanceFormatted}
              isLoading={escrowBalance.isLoading}
            />
            <BalanceRow
              name="Payroll"
              address={contracts.payroll.address}
              tutBalance={payrollBalance.tokenBalanceFormatted}
              isLoading={payrollBalance.isLoading}
            />
          </CardContent>
        </GlassCard>

        {/* Treasury Info */}
        <GlassCard>
          <CardHeader
            title="Treasury Management"
            description="How treasury funds are managed"
          />
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-800/30">
              <h4 className="font-medium text-white mb-2">Governance Controlled</h4>
              <p className="text-sm text-gray-400">
                All treasury operations require a governance proposal to pass before execution via the Timelock.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gray-800/30">
              <h4 className="font-medium text-white mb-2">Timelock Protected</h4>
              <p className="text-sm text-gray-400">
                A minimum delay is enforced between proposal approval and execution, allowing time for review.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-800/30">
              <h4 className="font-medium text-white mb-2">Multi-Contract System</h4>
              <p className="text-sm text-gray-400">
                Funds are distributed across Treasury, Escrow, and Payroll contracts for different purposes.
              </p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Contract Addresses */}
      <GlassCard>
        <CardHeader
          title="Contract Addresses"
          description="View contracts on Sepolia Etherscan"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContractLink name="Treasury" address={contracts.treasury.address} />
            <ContractLink name="Escrow" address={contracts.escrow.address} />
            <ContractLink name="Payroll" address={contracts.payroll.address} />
            <ContractLink name="Token (TUT)" address={contracts.token.address} />
            <ContractLink name="Governor" address={contracts.governor.address} />
            <ContractLink name="Timelock" address={contracts.timelock.address} />
            <ContractLink name="Compliance" address={contracts.compliance.address} />
            <ContractLink name="ESG" address={contracts.esg.address} />
          </div>
        </CardContent>
      </GlassCard>

      {/* Create Proposal CTA */}
      <GlassCard>
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Request Treasury Funds
                </h3>
                <p className="text-gray-400">
                  Create a governance proposal to allocate treasury funds for ecosystem development
                </p>
              </div>
            </div>
            <Link href="/proposals/create">
              <Button>
                Create Proposal
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}

function BalanceRow({ 
  name, 
  address, 
  tutBalance, 
  ethBalance, 
  isLoading 
}: { 
  name: string; 
  address: string; 
  tutBalance: string; 
  ethBalance?: string; 
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-gray-800/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/20">
          <Vault className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="font-medium text-white">{name}</p>
          <p className="text-xs text-gray-500 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      </div>
      <div className="text-right">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <>
            <p className="text-white font-medium">
              {formatNumber(parseFloat(tutBalance))} TUT
            </p>
            {ethBalance && (
              <p className="text-xs text-gray-400">
                {parseFloat(ethBalance).toFixed(4)} ETH
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContractLink({ name, address }: { name: string; address: string }) {
  return (
    <a
      href={`https://sepolia.etherscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-violet-500/30 transition-colors group"
    >
      <div>
        <p className="text-sm text-gray-400">{name}</p>
        <p className="text-white font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors" />
    </a>
  );
}
