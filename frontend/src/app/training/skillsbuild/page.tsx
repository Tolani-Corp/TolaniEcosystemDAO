"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Award,
  Coins,
  ExternalLink,
  Trophy,
  AlertCircle,
  Cpu,
  Cloud,
  Leaf,
  HardHat,
} from "lucide-react";
import { formatUnits, keccak256, toBytes } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";

// Campaign IDs (must match deployed contracts)
const CAMPAIGN_IDS = {
  CONSTRUCTION: keccak256(toBytes("TOLANI_CONSTRUCTION_TECH_V1")),
  AI_CLOUD: keccak256(toBytes("TOLANI_AI_CLOUD_V1")),
  ESG: keccak256(toBytes("TOLANI_ESG_TRACK_V1")),
} as const;

interface Campaign {
  id: `0x${string}`;
  name: string;
  description: string;
  icon: typeof HardHat;
  color: string;
  rewardPerCompletion: bigint;
  budget: bigint;
  spent: bigint;
  active: boolean;
  skillsBuildLink: string;
  modules: string[];
}

const CAMPAIGN_METADATA: Record<string, Omit<Campaign, 'rewardPerCompletion' | 'budget' | 'spent' | 'active'>> = {
  CONSTRUCTION: {
    id: CAMPAIGN_IDS.CONSTRUCTION,
    name: "Tolani Construction Tech Track",
    description: "Master project management, data analysis, and cloud computing for modern construction. Earn uTUT tokens as you build skills for Africa's infrastructure future.",
    icon: HardHat,
    color: "from-orange-500 to-amber-500",
    skillsBuildLink: "https://skillsbuild.org/construction-tech",
    modules: [
      "Project Management Fundamentals",
      "Data Analysis with Python",
      "Cloud Computing Basics",
    ],
  },
  AI_CLOUD: {
    id: CAMPAIGN_IDS.AI_CLOUD,
    name: "Tolani AI & Cloud Track",
    description: "Dive into artificial intelligence and cloud infrastructure. Learn to deploy ML models and build scalable cloud solutions for African enterprises.",
    icon: Cloud,
    color: "from-blue-500 to-cyan-500",
    skillsBuildLink: "https://skillsbuild.org/ai-cloud",
    modules: [
      "Introduction to AI",
      "Machine Learning Foundations",
      "Cloud Architecture Essentials",
      "AI Ethics & Governance",
    ],
  },
  ESG: {
    id: CAMPAIGN_IDS.ESG,
    name: "Tolani ESG Sustainability Track",
    description: "Learn environmental, social, and governance principles for sustainable development. Contribute to Africa's green transition while earning rewards.",
    icon: Leaf,
    color: "from-green-500 to-emerald-500",
    skillsBuildLink: "https://skillsbuild.org/esg",
    modules: [
      "ESG Fundamentals",
      "Carbon Accounting",
      "Sustainable Supply Chains",
    ],
  },
};

export default function SkillsBuildPage() {
  const { address, isConnected } = useAccount();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const chainId = CHAIN_IDS.SEPOLIA;
  const uTUTAddress = CONTRACT_ADDRESSES[chainId].uTUT;
  const trainingRewardsAddress = CONTRACT_ADDRESSES[chainId].trainingRewardsV2;

  // Read uTUT balance
  const { data: uTUTBalance } = useReadContract({
    address: uTUTAddress,
    abi: ABIS.uTUT,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read individual campaign data
  const { data: constructionData } = useReadContract({
    address: trainingRewardsAddress,
    abi: ABIS.trainingRewardsV2,
    functionName: "campaigns",
    args: [CAMPAIGN_IDS.CONSTRUCTION],
  });

  const { data: aiCloudData } = useReadContract({
    address: trainingRewardsAddress,
    abi: ABIS.trainingRewardsV2,
    functionName: "campaigns",
    args: [CAMPAIGN_IDS.AI_CLOUD],
  });

  const { data: esgData } = useReadContract({
    address: trainingRewardsAddress,
    abi: ABIS.trainingRewardsV2,
    functionName: "campaigns",
    args: [CAMPAIGN_IDS.ESG],
  });

  // Process campaign data
  useEffect(() => {
    const campaignDataMap: Record<keyof typeof CAMPAIGN_METADATA, unknown> = {
      CONSTRUCTION: constructionData,
      AI_CLOUD: aiCloudData,
      ESG: esgData,
    };

    const keys: Array<keyof typeof CAMPAIGN_METADATA> = ["CONSTRUCTION", "AI_CLOUD", "ESG"];

    const processedCampaigns: Campaign[] = keys
      .map((key) => {
        const data = campaignDataMap[key];
        if (!data) return null;

        const [name, rewardPerCompletion, budget, spent, , , active] = data as [
          string, bigint, bigint, bigint, bigint, bigint, boolean
        ];

        if (budget === BigInt(0)) return null;

        return {
          ...CAMPAIGN_METADATA[key],
          rewardPerCompletion,
          budget,
          spent,
          active,
        };
      })
      .filter((c): c is Campaign => c !== null);

    setCampaigns(processedCampaigns);
  }, [constructionData, aiCloudData, esgData]);

  const totalBudget = campaigns.reduce((acc, c) => acc + c.budget, BigInt(0));
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, BigInt(0));

  const stats = [
    {
      label: "Your uTUT Balance",
      value: uTUTBalance ? `${Number(formatUnits(uTUTBalance as bigint, 6)).toLocaleString()} uTUT` : "0 uTUT",
      icon: Coins,
      color: "text-yellow-400",
    },
    {
      label: "Active Tracks",
      value: campaigns.filter(c => c.active).length.toString(),
      icon: BookOpen,
      color: "text-blue-400",
    },
    {
      label: "Total Distributed",
      value: `${Number(formatUnits(totalSpent, 6)).toLocaleString()} uTUT`,
      icon: Trophy,
      color: "text-green-400",
    },
    {
      label: "Available Budget",
      value: `${Number(formatUnits(totalBudget - totalSpent, 6)).toLocaleString()} uTUT`,
      icon: Award,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-2xl text-gray-400">×</span>
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600/30 to-blue-400/30 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-blue-300" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-violet-400 bg-clip-text text-transparent mb-4">
            Tolani Labs × IBM SkillsBuild
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Complete IBM SkillsBuild training tracks and earn <span className="text-yellow-400 font-semibold">uTUT micro-tokens</span>.
            Build skills for Africa&apos;s digital future while contributing to the Tolani Ecosystem.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1a1a2e] rounded-xl p-4 border border-blue-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Connection Required */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8 text-center"
          >
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
            <p className="text-yellow-400 font-medium">Connect your wallet to track your training progress and uTUT balance</p>
          </motion.div>
        )}

        {/* Training Tracks */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            Training Tracks
          </h2>
          
          {campaigns.length === 0 ? (
            <div className="bg-[#1a1a2e] rounded-xl p-8 text-center border border-gray-800">
              <p className="text-gray-400">Loading campaigns...</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {campaigns.map((campaign, index) => {
                const Icon = campaign.icon;
                const budgetRemaining = campaign.budget - campaign.spent;
                const completions = campaign.spent / campaign.rewardPerCompletion;
                
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`bg-[#1a1a2e] rounded-xl border overflow-hidden ${
                      campaign.active
                        ? "border-blue-500/30 hover:border-blue-500/50"
                        : "border-gray-800"
                    } transition-all`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        {/* Icon & Title */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${campaign.color} bg-opacity-20 flex items-center justify-center`}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold">{campaign.name}</h3>
                              {campaign.active && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm mb-4">{campaign.description}</p>
                            
                            {/* Modules */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {campaign.modules.map((module) => (
                                <span
                                  key={module}
                                  className="px-2 py-1 text-xs bg-blue-500/10 text-blue-300 rounded-md border border-blue-500/20"
                                >
                                  {module}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Reward & Stats */}
                        <div className="flex flex-col items-end gap-3 min-w-[200px]">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Reward per completion</p>
                            <p className="text-2xl font-bold text-yellow-400">
                              {formatUnits(campaign.rewardPerCompletion, 6)} uTUT
                            </p>
                          </div>
                          
                          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${campaign.color}`}
                              style={{
                                width: `${Math.min(
                                  (Number(campaign.spent) / Number(campaign.budget)) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between w-full text-xs text-gray-500">
                            <span>{Number(completions).toLocaleString()} completions</span>
                            <span>{formatUnits(budgetRemaining, 6)} uTUT left</span>
                          </div>
                          
                          <a
                            href={campaign.skillsBuildLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-2 px-4 py-2 rounded-lg bg-gradient-to-r ${campaign.color} text-white font-medium flex items-center gap-2 hover:opacity-90 transition`}
                          >
                            Start on IBM SkillsBuild
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-500/20 p-6"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-400" />
            How It Works
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Connect Wallet</h4>
                <p className="text-sm text-gray-400">
                  Link your Ethereum wallet to track your training rewards.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Complete Training</h4>
                <p className="text-sm text-gray-400">
                  Finish IBM SkillsBuild courses and earn your digital badge.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Verify Badge</h4>
                <p className="text-sm text-gray-400">
                  Our system verifies your IBM SkillsBuild badge automatically.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                4
              </div>
              <div>
                <h4 className="font-medium mb-1">Receive uTUT</h4>
                <p className="text-sm text-gray-400">
                  uTUT tokens are minted directly to your wallet - gasless!
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* uTUT Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-[#1a1a2e] rounded-xl border border-yellow-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <Coins className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-semibold">About uTUT (Micro-Utility Token)</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            uTUT is a micro-utility token designed for training rewards. It uses 6 decimals (vs TUT&apos;s 18) for smaller, more precise reward amounts.
            Convert your uTUT to TUT governance tokens when you&apos;re ready to participate in DAO voting.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="px-3 py-1 bg-yellow-500/10 rounded-lg">
              <span className="text-yellow-400 font-medium">1 TUT = 1,000,000 uTUT</span>
            </div>
            <div className="px-3 py-1 bg-gray-800 rounded-lg">
              <span className="text-gray-300">6 decimals</span>
            </div>
            <div className="px-3 py-1 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Gasless minting via relayer</span>
            </div>
          </div>
        </motion.div>

        {/* Contract Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-sm text-gray-500 space-y-1"
        >
          <p>
            uTUT Token:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${uTUTAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              {uTUTAddress?.slice(0, 10)}...{uTUTAddress?.slice(-8)}
            </a>
          </p>
          <p>
            Training Rewards:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${trainingRewardsAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              {trainingRewardsAddress?.slice(0, 10)}...{trainingRewardsAddress?.slice(-8)}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
