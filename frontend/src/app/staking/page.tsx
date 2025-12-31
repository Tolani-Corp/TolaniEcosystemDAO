"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  Coins,
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  Shield,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Percent,
  Vote,
} from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";

const STAKING_TIERS = [
  {
    name: "Flexible",
    tier: 0,
    lockDays: 0,
    rewardMultiplier: "1x",
    votingBoost: "1x",
    minStake: 100,
    color: "from-gray-500 to-gray-600",
    icon: Unlock,
  },
  {
    name: "Bronze",
    tier: 1,
    lockDays: 30,
    rewardMultiplier: "1.25x",
    votingBoost: "1.1x",
    minStake: 1000,
    color: "from-amber-700 to-amber-800",
    icon: Shield,
  },
  {
    name: "Silver",
    tier: 2,
    lockDays: 90,
    rewardMultiplier: "1.5x",
    votingBoost: "1.25x",
    minStake: 10000,
    color: "from-gray-400 to-gray-500",
    icon: Shield,
  },
  {
    name: "Gold",
    tier: 3,
    lockDays: 180,
    rewardMultiplier: "2x",
    votingBoost: "1.5x",
    minStake: 50000,
    color: "from-yellow-500 to-amber-500",
    icon: Award,
  },
  {
    name: "Diamond",
    tier: 4,
    lockDays: 365,
    rewardMultiplier: "3x",
    votingBoost: "2x",
    minStake: 100000,
    color: "from-cyan-400 to-blue-400",
    icon: Award,
  },
];

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const chainId = CHAIN_IDS.SEPOLIA;
  const stakingPoolAddress = CONTRACT_ADDRESSES[chainId].stakingPool;
  const tokenAddress = CONTRACT_ADDRESSES[chainId].token;

  // Read pool stats
  const { data: poolStats } = useReadContract({
    address: stakingPoolAddress,
    abi: ABIS.stakingPool,
    functionName: "getPoolStats",
  });

  // Read user token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read user's staked amount
  const { data: userTotalStaked } = useReadContract({
    address: stakingPoolAddress,
    abi: ABIS.stakingPool,
    functionName: "userTotalStaked",
    args: address ? [address] : undefined,
  });

  // Read pending rewards
  const { data: pendingRewards } = useReadContract({
    address: stakingPoolAddress,
    abi: ABIS.stakingPool,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
  });

  // Read voting power
  const { data: votingPower } = useReadContract({
    address: stakingPoolAddress,
    abi: ABIS.stakingPool,
    functionName: "getVotingPower",
    args: address ? [address] : undefined,
  });

  const { writeContract: stake, data: stakeHash } = useWriteContract();
  const { writeContract: claim, data: claimHash } = useWriteContract();
  const { writeContract: approve, data: approveHash } = useWriteContract();

  const { isLoading: isStakeLoading, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  const { isLoading: isClaimLoading, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  const totalStaked = poolStats ? (poolStats as [bigint, bigint, bigint, bigint])[0] : BigInt(0);
  const rewardRate = poolStats ? (poolStats as [bigint, bigint, bigint, bigint])[1] : BigInt(0);
  const rewardsEndTime = poolStats ? (poolStats as [bigint, bigint, bigint, bigint])[2] : BigInt(0);
  const totalDistributed = poolStats ? (poolStats as [bigint, bigint, bigint, bigint])[3] : BigInt(0);

  const stats = [
    {
      label: "Total Staked",
      value: `${Number(formatUnits(totalStaked, 18)).toLocaleString()} TUT`,
      icon: Lock,
      color: "text-purple-400",
    },
    {
      label: "Your Staked",
      value: userTotalStaked
        ? `${Number(formatUnits(userTotalStaked as bigint, 18)).toLocaleString()} TUT`
        : "0 TUT",
      icon: Coins,
      color: "text-blue-400",
    },
    {
      label: "Pending Rewards",
      value: pendingRewards
        ? `${Number(formatUnits(pendingRewards as bigint, 18)).toFixed(2)} TUT`
        : "0 TUT",
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      label: "Voting Power",
      value: votingPower
        ? `${Number(formatUnits(votingPower as bigint, 18)).toLocaleString()}`
        : "0",
      icon: Vote,
      color: "text-yellow-400",
    },
  ];

  const handleStake = async () => {
    if (!address || !stakeAmount) return;

    setIsStaking(true);
    try {
      const amount = parseUnits(stakeAmount, 18);
      
      // First approve
      approve({
        address: tokenAddress,
        abi: ABIS.token,
        functionName: "approve",
        args: [stakingPoolAddress, amount],
      });

      // Then stake
      stake({
        address: stakingPoolAddress,
        abi: ABIS.stakingPool,
        functionName: "stake",
        args: [amount, selectedTier],
      });
    } catch (error) {
      console.error("Staking error:", error);
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaim = async () => {
    if (!address) return;

    setIsClaiming(true);
    try {
      claim({
        address: stakingPoolAddress,
        abi: ABIS.stakingPool,
        functionName: "claimRewards",
      });
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const selectedTierInfo = STAKING_TIERS[selectedTier];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 mb-4">
            <Coins className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
            Staking Pool
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Stake your TUT tokens to earn rewards and boost your governance voting power.
            Choose from multiple tiers with different lock periods and reward multipliers.
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
              className="bg-[#1a1a2e] rounded-xl p-4 border border-green-500/20"
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
            <p className="text-yellow-400 font-medium">Connect your wallet to stake TUT tokens</p>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Tier Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1a1a2e] rounded-xl border border-green-500/20 p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Select Staking Tier
            </h2>

            <div className="space-y-3">
              {STAKING_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  onClick={() => setSelectedTier(tier.tier)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTier === tier.tier
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                        <tier.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{tier.name}</h3>
                        <p className="text-sm text-gray-400">
                          {tier.lockDays === 0 ? "No lock" : `${tier.lockDays} days lock`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">{tier.rewardMultiplier}</p>
                      <p className="text-xs text-gray-400">rewards</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-800/50 rounded px-2 py-1">
                      <span className="text-gray-500">Min: </span>
                      <span className="text-white">{tier.minStake.toLocaleString()} TUT</span>
                    </div>
                    <div className="bg-gray-800/50 rounded px-2 py-1">
                      <span className="text-gray-500">Voting: </span>
                      <span className="text-yellow-400">{tier.votingBoost}</span>
                    </div>
                    <div className="bg-gray-800/50 rounded px-2 py-1">
                      <span className="text-gray-500">Lock: </span>
                      <span className="text-white">{tier.lockDays}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stake Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Stake Card */}
            <div className="bg-[#1a1a2e] rounded-xl border border-green-500/20 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-green-400" />
                Stake TUT
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Amount to stake</span>
                    <span className="text-gray-400">
                      Balance:{" "}
                      {tokenBalance
                        ? Number(formatUnits(tokenBalance as bigint, 18)).toLocaleString()
                        : "0"}{" "}
                      TUT
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder={`Min: ${selectedTierInfo.minStake.toLocaleString()} TUT`}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none transition"
                    />
                    <button
                      onClick={() => {
                        if (tokenBalance) {
                          setStakeAmount(formatUnits(tokenBalance as bigint, 18));
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-green-400 hover:text-green-300 px-2 py-1"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Selected Tier Summary */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400">Selected Tier</span>
                    <span className={`font-semibold bg-gradient-to-r ${selectedTierInfo.color} bg-clip-text text-transparent`}>
                      {selectedTierInfo.name}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lock Period</span>
                      <span>{selectedTierInfo.lockDays === 0 ? "No lock" : `${selectedTierInfo.lockDays} days`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reward Multiplier</span>
                      <span className="text-green-400">{selectedTierInfo.rewardMultiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Voting Power Boost</span>
                      <span className="text-yellow-400">{selectedTierInfo.votingBoost}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={!isConnected || isStaking || !stakeAmount}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isStaking || isStakeLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Staking...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Stake TUT
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Claim Rewards Card */}
            <div className="bg-[#1a1a2e] rounded-xl border border-green-500/20 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Pending Rewards
              </h2>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">
                    {pendingRewards
                      ? Number(formatUnits(pendingRewards as bigint, 18)).toFixed(4)
                      : "0.0000"}{" "}
                    TUT
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Available to claim</p>
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={!isConnected || isClaiming || !pendingRewards || (pendingRewards as bigint) === BigInt(0)}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isClaiming || isClaimLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5" />
                    Claim Rewards
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Contract Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center text-sm text-gray-500"
        >
          <p>
            Staking Pool Contract:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${stakingPoolAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition"
            >
              {stakingPoolAddress}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
