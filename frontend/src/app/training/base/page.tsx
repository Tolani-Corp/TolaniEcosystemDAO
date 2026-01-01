"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from "wagmi";
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
  Zap,
  ArrowRight,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { formatUnits, keccak256, toBytes, parseUnits } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";
import Link from "next/link";

// Campaign IDs (must match deployed contracts)
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
  completedByUser: boolean;
}

const CAMPAIGN_METADATA: Record<string, Omit<Campaign, 'rewardPerCompletion' | 'budget' | 'spent' | 'active' | 'completedByUser'>> = {
  CONSTRUCTION: {
    id: CAMPAIGN_IDS.CONSTRUCTION,
    key: "CONSTRUCTION",
    name: "Construction Tech Track",
    description: "Master project management, data analysis, and cloud computing for modern construction. Earn uTUT tokens for Africa's infrastructure future.",
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
    key: "AI_CLOUD",
    name: "AI & Cloud Track",
    description: "Dive into artificial intelligence and cloud infrastructure. Deploy ML models and build scalable solutions for African enterprises.",
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
    key: "ESG",
    name: "ESG Sustainability Track",
    description: "Learn environmental, social, and governance principles. Contribute to Africa's green transition while earning rewards.",
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

// TUT Converter ABI
const TUT_CONVERTER_ABI = [
  "function convert(uint256 uTUTAmount) external",
  "function previewConversion(uint256 uTUTAmount) view returns (uint256)",
  "function CONVERSION_RATE() view returns (uint256)",
] as const;

export default function BaseTrainingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const isBaseSepolia = chainId === CHAIN_IDS.BASE_SEPOLIA;
  const baseAddresses = CONTRACT_ADDRESSES[CHAIN_IDS.BASE_SEPOLIA];

  // Read uTUT balance
  const { data: uTUTBalance, refetch: refetchBalance } = useReadContract({
    address: baseAddresses.uTUT,
    abi: ABIS.uTUT,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_IDS.BASE_SEPOLIA,
  });

  // Read TUT balance (bridged)
  const { data: tutBalance } = useReadContract({
    address: baseAddresses.mockBridgedTUT,
    abi: [{ 
      name: "balanceOf", 
      type: "function", 
      inputs: [{ name: "account", type: "address" }], 
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view"
    }],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_IDS.BASE_SEPOLIA,
  });

  // Convert uTUT to TUT
  const { writeContract: convertTokens, data: convertHash, isPending: isConvertPending } = useWriteContract();
  const { isLoading: isConvertConfirming, isSuccess: isConvertSuccess } = useWaitForTransactionReceipt({
    hash: convertHash,
  });

  // Load campaigns (mock data for now)
  useEffect(() => {
    const loadCampaigns = async () => {
      const loadedCampaigns: Campaign[] = Object.entries(CAMPAIGN_METADATA).map(([key, meta]) => ({
        ...meta,
        rewardPerCompletion: key === "AI_CLOUD" ? BigInt(4000000) : key === "ESG" ? BigInt(3000000) : BigInt(2000000),
        budget: BigInt(100000000000), // 100,000 uTUT
        spent: BigInt(0),
        active: true,
        completedByUser: false,
      }));
      setCampaigns(loadedCampaigns);
    };
    loadCampaigns();
  }, [address]);

  // Handle conversion success
  useEffect(() => {
    if (isConvertSuccess) {
      setConvertAmount("");
      setIsConverting(false);
      refetchBalance();
    }
  }, [isConvertSuccess, refetchBalance]);

  const handleConvert = async () => {
    if (!convertAmount || !isConnected || !isBaseSepolia) return;
    
    const amount = parseUnits(convertAmount, 6); // uTUT has 6 decimals
    
    setIsConverting(true);
    try {
      // First approve
      await convertTokens({
        address: baseAddresses.uTUT,
        abi: ABIS.uTUT,
        functionName: "approve",
        args: [baseAddresses.tutConverter, amount],
        chainId: CHAIN_IDS.BASE_SEPOLIA,
      });
    } catch (error) {
      console.error("Conversion error:", error);
      setIsConverting(false);
    }
  };

  const stats = [
    {
      label: "Your uTUT Balance",
      value: uTUTBalance 
        ? `${(Number(uTUTBalance) / 1_000_000).toLocaleString()} uTUT`
        : "0 uTUT",
      icon: Coins,
      color: "text-yellow-400",
    },
    {
      label: "Your TUT Balance",
      value: tutBalance 
        ? `${Number(formatUnits(tutBalance as bigint, 18)).toLocaleString()} TUT`
        : "0 TUT",
      icon: Award,
      color: "text-purple-400",
    },
    {
      label: "Available Tracks",
      value: campaigns.filter(c => c.active).length.toString(),
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
        {/* Header */}
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
            <Link 
              href="/training/skillsbuild"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Sepolia L1 Training
            </Link>
            <span className="text-gray-600">|</span>
            <a 
              href="https://skillsbuild.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              IBM SkillsBuild <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>

        {/* Network Switch Banner */}
        {isConnected && !isBaseSepolia && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="font-semibold text-red-300">Wrong Network</p>
                  <p className="text-sm text-gray-400">
                    Switch to Base Sepolia to access L2 training rewards
                  </p>
                </div>
              </div>
              <button
                onClick={() => switchChain({ chainId: CHAIN_IDS.BASE_SEPOLIA })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Switch to Base
              </button>
            </div>
          </motion.div>
        )}

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

        {/* uTUT to TUT Converter */}
        {isConnected && isBaseSepolia && uTUTBalance && Number(uTUTBalance) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-12 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20"
          >
            <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Convert uTUT to TUT
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Convert your earned micro-utility tokens (uTUT) to full TUT tokens for governance participation.
              Rate: 1,000,000 uTUT = 1 TUT
            </p>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm text-gray-400 mb-1 block">Amount (uTUT)</label>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="1000000"
                  className="w-full px-4 py-2 bg-[#0D0D0D] border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleConvert}
                disabled={!convertAmount || isConverting || isConvertPending || isConvertConfirming}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isConvertPending || isConvertConfirming ? "Converting..." : "Convert"}
              </button>
            </div>
            {convertAmount && Number(convertAmount) > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                ≈ {(Number(convertAmount) / 1_000_000).toFixed(6)} TUT
              </p>
            )}
          </motion.div>
        )}

        {/* Connection Required */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-[#1a1a2e] rounded-xl border border-blue-500/20 mb-12"
          >
            <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400">
              Connect your wallet to view training tracks and earn uTUT rewards
            </p>
          </motion.div>
        )}

        {/* Training Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            IBM SkillsBuild Training Tracks
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-[#1a1a2e] rounded-xl border border-${campaign.color.split(' ')[0].replace('from-', '')}/30 overflow-hidden`}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${campaign.color} p-4`}>
                  <div className="flex items-center gap-3">
                    <campaign.icon className="w-8 h-8 text-white" />
                    <div>
                      <h3 className="font-bold text-white">{campaign.name}</h3>
                      <p className="text-sm text-white/80">
                        {Number(campaign.rewardPerCompletion) / 1_000_000} uTUT per module
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-4">{campaign.description}</p>

                  {/* Modules */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Modules</p>
                    <ul className="space-y-1">
                      {campaign.modules.map((module, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle2 className={`w-4 h-4 ${campaign.completedByUser ? 'text-green-400' : 'text-gray-600'}`} />
                          {module}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Budget Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Budget Used</span>
                      <span>
                        {(Number(campaign.spent) / 1_000_000).toLocaleString()} / {(Number(campaign.budget) / 1_000_000).toLocaleString()} uTUT
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${campaign.color}`}
                        style={{ width: `${(Number(campaign.spent) / Number(campaign.budget)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <a
                    href={campaign.skillsBuildLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-2 rounded-lg bg-gradient-to-r ${campaign.color} hover:opacity-90 font-medium transition-opacity`}
                  >
                    Start Learning
                    <ExternalLink className="w-4 h-4 inline ml-2" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-6 bg-[#1a1a2e] rounded-xl border border-blue-500/20"
        >
          <h3 className="text-xl font-bold mb-6 text-center">How Base L2 Training Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Connect Wallet", desc: "Connect to Base Sepolia network", icon: Wallet },
              { step: 2, title: "Complete Courses", desc: "Finish IBM SkillsBuild modules", icon: BookOpen },
              { step: 3, title: "Earn uTUT", desc: "Receive micro-utility tokens instantly", icon: Coins },
              { step: 4, title: "Convert to TUT", desc: "Exchange for governance tokens", icon: Trophy },
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

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 grid md:grid-cols-3 gap-4"
        >
          {[
            { title: "Low Gas Fees", desc: "Base L2 offers 10x cheaper transactions", icon: Zap, color: "blue" },
            { title: "Instant Rewards", desc: "Receive tokens as soon as you complete", icon: Award, color: "yellow" },
            { title: "Governance Rights", desc: "Convert to TUT for DAO voting power", icon: Trophy, color: "purple" },
          ].map(({ title, desc, icon: Icon, color }) => (
            <div key={title} className={`p-4 bg-${color}-500/10 rounded-xl border border-${color}-500/20`}>
              <Icon className={`w-6 h-6 text-${color}-400 mb-2`} />
              <h4 className="font-semibold mb-1">{title}</h4>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
