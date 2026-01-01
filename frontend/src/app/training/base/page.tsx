"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useChainId, useSwitchChain } from "wagmi";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Award,
  Coins,
  ExternalLink,
  Trophy,
  Cloud,
  Leaf,
  HardHat,
  Zap,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { formatUnits, keccak256, toBytes } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";
import Link from "next/link";

const CAMPAIGN_IDS = {
  CONSTRUCTION: keccak256(toBytes("TOLANI_CONSTRUCTION_TECH_V1")),
  AI_CLOUD: keccak256(toBytes("TOLANI_AI_CLOUD_V1")),
  ESG: keccak256(toBytes("TOLANI_ESG_TRACK_V1")),
} as const;

interface Campaign {
  id: `0x${string}`;
  key: string;
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

const CAMPAIGN_DATA: Campaign[] = [
  {
    id: CAMPAIGN_IDS.CONSTRUCTION,
    key: "CONSTRUCTION",
    name: "Construction Tech Track",
    description: "Master project management, data analysis, and cloud computing for modern construction.",
    icon: HardHat,
    color: "from-orange-500 to-amber-500",
    rewardPerCompletion: BigInt(2000000),
    budget: BigInt(100000000000),
    spent: BigInt(0),
    active: true,
    skillsBuildLink: "https://skillsbuild.org/construction-tech",
    modules: ["Project Management", "Data Analysis", "Cloud Computing"],
  },
  {
    id: CAMPAIGN_IDS.AI_CLOUD,
    key: "AI_CLOUD",
    name: "AI & Cloud Track",
    description: "Dive into artificial intelligence and cloud infrastructure for African enterprises.",
    icon: Cloud,
    color: "from-blue-500 to-cyan-500",
    rewardPerCompletion: BigInt(4000000),
    budget: BigInt(100000000000),
    spent: BigInt(0),
    active: true,
    skillsBuildLink: "https://skillsbuild.org/ai-cloud",
    modules: ["AI Fundamentals", "ML Basics", "Cloud Architecture", "AI Ethics"],
  },
  {
    id: CAMPAIGN_IDS.ESG,
    key: "ESG",
    name: "ESG Sustainability Track",
    description: "Learn environmental, social, and governance principles for Africa's green transition.",
    icon: Leaf,
    color: "from-green-500 to-emerald-500",
    rewardPerCompletion: BigInt(3000000),
    budget: BigInt(100000000000),
    spent: BigInt(0),
    active: true,
    skillsBuildLink: "https://skillsbuild.org/esg",
    modules: ["ESG Fundamentals", "Carbon Accounting", "Sustainable Supply Chains"],
  },
];

export default function BaseTrainingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [campaigns] = useState<Campaign[]>(CAMPAIGN_DATA);

  const isBaseSepolia = chainId === CHAIN_IDS.BASE_SEPOLIA;
  const baseAddresses = CONTRACT_ADDRESSES[CHAIN_IDS.BASE_SEPOLIA];

  const { data: uTUTBalance } = useReadContract({
    address: baseAddresses.uTUT,
    abi: ABIS.uTUT,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_IDS.BASE_SEPOLIA,
  });

  const stats = [
    {
      label: "Your uTUT Balance",
      value: uTUTBalance ? `${(Number(uTUTBalance) / 1_000_000).toLocaleString()} uTUT` : "0 uTUT",
      icon: Coins,
      color: "text-yellow-400",
    },
    {
      label: "Available Tracks",
      value: campaigns.filter((c) => c.active).length.toString(),
      icon: BookOpen,
      color: "text-blue-400",
    },
    {
      label: "Network",
      value: isBaseSepolia ? "Base Sepolia" : "Wrong Network",
      icon: Zap,
      color: isBaseSepolia ? "text-green-400" : "text-red-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 bg-clip-text text-transparent mb-4">
            Base L2 Training Academy
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto mb-4">
            Low-cost training rewards on Base Layer 2. Complete IBM SkillsBuild courses,
            earn uTUT tokens, and convert to TUT for governance participation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/training/skillsbuild" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Sepolia L1 Training
            </Link>
            <span className="text-gray-600">|</span>
            <a href="https://skillsbuild.org" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              IBM SkillsBuild <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#1a1a2e] rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {!isConnected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-[#1a1a2e] rounded-xl border border-blue-500/20 mb-12">
            <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400">Connect your wallet to view training tracks and earn uTUT rewards</p>
          </motion.div>
        )}

        {isConnected && !isBaseSepolia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
            <div className="flex items-center justify-between">
              <p className="text-red-300">Switch to Base Sepolia to access L2 training rewards</p>
              <button onClick={() => switchChain({ chainId: CHAIN_IDS.BASE_SEPOLIA })} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
                Switch Network
              </button>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            IBM SkillsBuild Training Tracks
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.key} className="bg-[#1a1a2e] rounded-xl border border-blue-500/20 overflow-hidden">
                <div className={`bg-gradient-to-r ${campaign.color} p-4`}>
                  <div className="flex items-center gap-3">
                    <campaign.icon className="w-8 h-8 text-white" />
                    <div>
                      <h3 className="font-bold text-white">{campaign.name}</h3>
                      <p className="text-sm text-white/80">{Number(campaign.rewardPerCompletion) / 1_000_000} uTUT per module</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-4">{campaign.description}</p>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Modules</p>
                    <ul className="space-y-1">
                      {campaign.modules.map((module, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-gray-600" />
                          {module}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={campaign.skillsBuildLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-2 rounded-lg bg-gradient-to-r ${campaign.color} hover:opacity-90 font-medium`}
                  >
                    Start Learning <ExternalLink className="w-4 h-4 inline ml-2" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12 p-6 bg-[#1a1a2e] rounded-xl border border-blue-500/20">
          <h3 className="text-xl font-bold mb-6 text-center">How Base L2 Training Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Connect Wallet", desc: "Connect to Base Sepolia", icon: Wallet },
              { step: 2, title: "Complete Courses", desc: "Finish IBM modules", icon: BookOpen },
              { step: 3, title: "Earn uTUT", desc: "Receive tokens instantly", icon: Coins },
              { step: 4, title: "Convert to TUT", desc: "Exchange for governance", icon: Trophy },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-sm text-blue-400 mb-1">Step {step}</div>
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
