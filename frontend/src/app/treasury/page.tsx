"use client";

import { motion } from "framer-motion";
import {
  Vault,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Coins,
  DollarSign,
} from "lucide-react";
import { StatCard, GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { Button, Badge } from "@/components/ui/button";
import { TreasuryOverview, AssetRow } from "@/components/treasury/treasury-charts";
import { formatNumber } from "@/lib/utils";

const mockTreasuryData = {
  ethBalance: 450,
  tokenBalance: 15000000,
  totalValue: 2450000,
  assets: [
    { name: "ETH", value: 1125000, color: "#627EEA" },
    { name: "TUT", value: 750000, color: "#8B5CF6" },
    { name: "USDC", value: 350000, color: "#2775CA" },
    { name: "USDT", value: 225000, color: "#50AF95" },
  ],
  history: [
    { date: "Jan", value: 1800000 },
    { date: "Feb", value: 1950000 },
    { date: "Mar", value: 2100000 },
    { date: "Apr", value: 2000000 },
    { date: "May", value: 2250000 },
    { date: "Jun", value: 2450000 },
  ],
};

const mockTransactions = [
  {
    type: "inflow",
    description: "Protocol fees collected",
    amount: "+125,000 TUT",
    value: "$6,250",
    time: "2 hours ago",
    hash: "0x1234...5678",
  },
  {
    type: "outflow",
    description: "Developer grant payment",
    amount: "-50,000 USDC",
    value: "$50,000",
    time: "1 day ago",
    hash: "0xabcd...ef12",
  },
  {
    type: "inflow",
    description: "NFT royalties",
    amount: "+2.5 ETH",
    value: "$6,250",
    time: "2 days ago",
    hash: "0x5678...9abc",
  },
  {
    type: "outflow",
    description: "Security audit payment",
    amount: "-75,000 USDC",
    value: "$75,000",
    time: "5 days ago",
    hash: "0xdef1...2345",
  },
  {
    type: "inflow",
    description: "Partnership revenue",
    amount: "+100,000 TUT",
    value: "$5,000",
    time: "1 week ago",
    hash: "0x9876...5432",
  },
];

export default function TreasuryPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Treasury</h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor DAO treasury assets
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Create Withdrawal Proposal
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Value"
          value={`$${formatNumber(mockTreasuryData.totalValue)}`}
          change="+8.3% this month"
          changeType="positive"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="ETH Balance"
          value={`${mockTreasuryData.ethBalance} ETH`}
          change="+12 ETH"
          changeType="positive"
          icon={Coins}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          title="TUT Balance"
          value={formatNumber(mockTreasuryData.tokenBalance)}
          change="+500K TUT"
          changeType="positive"
          icon={Vault}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          title="30D Change"
          value="+$320,000"
          change="+15.1%"
          changeType="positive"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
        />
      </div>

      {/* Charts */}
      <TreasuryOverview data={mockTreasuryData} />

      {/* Assets and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Holdings */}
        <GlassCard>
          <CardHeader
            title="Asset Holdings"
            description="Current treasury asset breakdown"
          />
          <CardContent className="space-y-2">
            <AssetRow
              name="Ethereum"
              symbol="ETH"
              balance="450 ETH"
              value="$1,125,000"
              change="+5.2%"
              changeType="positive"
              icon={<Coins className="w-5 h-5 text-blue-400" />}
            />
            <AssetRow
              name="Tolani Token"
              symbol="TUT"
              balance="15,000,000 TUT"
              value="$750,000"
              change="+2.8%"
              changeType="positive"
              icon={<Coins className="w-5 h-5 text-violet-400" />}
            />
            <AssetRow
              name="USD Coin"
              symbol="USDC"
              balance="350,000 USDC"
              value="$350,000"
              change="0.0%"
              changeType="positive"
              icon={<Coins className="w-5 h-5 text-blue-500" />}
            />
            <AssetRow
              name="Tether"
              symbol="USDT"
              balance="225,000 USDT"
              value="$225,000"
              change="0.0%"
              changeType="positive"
              icon={<Coins className="w-5 h-5 text-green-500" />}
            />
          </CardContent>
        </GlassCard>

        {/* Recent Transactions */}
        <GlassCard>
          <CardHeader
            title="Recent Transactions"
            description="Latest treasury movements"
            action={
              <Button variant="ghost" size="sm">
                View All
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {mockTransactions.map((tx, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      tx.type === "inflow"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {tx.type === "inflow" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500">{tx.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      tx.type === "inflow" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount}
                  </p>
                  <p className="text-xs text-gray-500">{tx.value}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </GlassCard>
      </div>

      {/* Spending Proposals */}
      <GlassCard>
        <CardHeader
          title="Pending Spending Proposals"
          description="Treasury withdrawal requests awaiting execution"
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Proposal
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Recipient
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-white">
                      TIP-12: Dev Grant Q1
                    </p>
                    <p className="text-xs text-gray-500">Created 3 days ago</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-gray-300 font-mono">
                      0x1234...5678
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-white">150,000 USDC</p>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="warning">Queued</Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="secondary" size="sm">
                      Execute
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-white">
                      TIP-8: Ecosystem Fund
                    </p>
                    <p className="text-xs text-gray-500">Created 1 week ago</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-gray-300 font-mono">
                      0xabcd...ef12
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-white">500,000 TUT</p>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="info">Ready</Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button size="sm">Execute</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
