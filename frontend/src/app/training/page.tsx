"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Coins,
  Lock,
  Play,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";

interface Course {
  id: number;
  name: string;
  description: string;
  reward: bigint;
  maxCompletions: bigint;
  completions: bigint;
  active: boolean;
}

export default function TrainingPage() {
  const { address, isConnected } = useAccount();
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Set<number>>(new Set());
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  const chainId = CHAIN_IDS.SEPOLIA;
  const trainingRewardsAddress = CONTRACT_ADDRESSES[chainId].trainingRewards;

  // Read course count
  const { data: courseCount } = useReadContract({
    address: trainingRewardsAddress,
    abi: ABIS.trainingRewards,
    functionName: "courseCount",
  });

  // Read total rewards distributed
  const { data: totalRewardsDistributed } = useReadContract({
    address: trainingRewardsAddress,
    abi: ABIS.trainingRewards,
    functionName: "totalRewardsDistributed",
  });

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!courseCount) return;
      
      const count = Number(courseCount);
      const fetchedCourses: Course[] = [];
      
      for (let i = 0; i < count; i++) {
        try {
          const response = await fetch(`/api/course/${i}`);
          if (response.ok) {
            const data = await response.json();
            fetchedCourses.push({ id: i, ...data });
          }
        } catch (error) {
          console.error(`Error fetching course ${i}:`, error);
        }
      }
      
      setCourses(fetchedCourses);
    };

    // For now, use mock data since we don't have API endpoints
    const mockCourses: Course[] = [
      {
        id: 0,
        name: "DAO Basics",
        description: "Introduction to DAOs and governance - learn the fundamentals of decentralized autonomous organizations.",
        reward: BigInt("100000000000000000000"), // 100 TUT
        maxCompletions: BigInt(10000),
        completions: BigInt(0),
        active: true,
      },
      {
        id: 1,
        name: "TUT Token Guide",
        description: "Understanding TUT tokenomics - learn about token distribution, staking, and governance power.",
        reward: BigInt("150000000000000000000"), // 150 TUT
        maxCompletions: BigInt(10000),
        completions: BigInt(0),
        active: true,
      },
      {
        id: 2,
        name: "Voting & Proposals",
        description: "How to participate in governance - create proposals, vote, and delegate your voting power.",
        reward: BigInt("200000000000000000000"), // 200 TUT
        maxCompletions: BigInt(10000),
        completions: BigInt(0),
        active: true,
      },
      {
        id: 3,
        name: "DeFi Fundamentals",
        description: "Learn about liquidity provision, staking pools, and yield farming strategies.",
        reward: BigInt("250000000000000000000"), // 250 TUT
        maxCompletions: BigInt(5000),
        completions: BigInt(0),
        active: true,
      },
      {
        id: 4,
        name: "Advanced Governance",
        description: "Master proposal creation, timelock operations, and treasury management.",
        reward: BigInt("300000000000000000000"), // 300 TUT
        maxCompletions: BigInt(2000),
        completions: BigInt(0),
        active: true,
      },
    ];
    setCourses(mockCourses);
  }, [courseCount]);

  const stats = [
    {
      label: "Available Courses",
      value: courses.length.toString(),
      icon: BookOpen,
      color: "text-blue-400",
    },
    {
      label: "Your Completions",
      value: completedCourses.size.toString(),
      icon: Trophy,
      color: "text-yellow-400",
    },
    {
      label: "Total Rewards Distributed",
      value: totalRewardsDistributed
        ? `${Number(formatUnits(totalRewardsDistributed as bigint, 18)).toLocaleString()} TUT`
        : "0 TUT",
      icon: Coins,
      color: "text-green-400",
    },
    {
      label: "Potential Earnings",
      value: `${courses.reduce((acc, c) => acc + Number(formatUnits(c.reward, 18)), 0).toLocaleString()} TUT`,
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 mb-4">
            <GraduationCap className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Training Academy
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Complete training courses to earn TUT tokens and become a knowledgeable member of the Tolani Ecosystem DAO.
            Each course rewards you with TUT upon completion.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-[#1a1a2e] rounded-xl p-4 border border-purple-500/20"
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
            <p className="text-yellow-400 font-medium">Connect your wallet to track progress and claim rewards</p>
          </motion.div>
        )}

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`bg-[#1a1a2e] rounded-xl border overflow-hidden ${
                completedCourses.has(course.id)
                  ? "border-green-500/30"
                  : "border-purple-500/20 hover:border-purple-500/50"
              } transition-all`}
            >
              {/* Course Header */}
              <div className="relative p-6 pb-4">
                {completedCourses.has(course.id) && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{course.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <Coins className="w-4 h-4" />
                      <span>{formatUnits(course.reward, 18)} TUT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-400">{course.description}</p>
              </div>

              {/* Progress Bar */}
              <div className="px-6 pb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Completions</span>
                  <span>
                    {Number(course.completions).toLocaleString()} / {Number(course.maxCompletions).toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{
                      width: `${Math.min(
                        (Number(course.completions) / Number(course.maxCompletions)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 border-t border-gray-800">
                {completedCourses.has(course.id) ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 rounded-lg bg-green-500/20 text-green-400 font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </button>
                ) : !course.active ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 rounded-lg bg-gray-700/50 text-gray-500 font-medium flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Unavailable
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedCourse(course.id)}
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Start Course
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20 p-6"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Choose a Course</h4>
                <p className="text-sm text-gray-400">
                  Select from our curated training courses designed to onboard you into the DAO ecosystem.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Complete Training</h4>
                <p className="text-sm text-gray-400">
                  Work through the course materials and pass the assessment to demonstrate your knowledge.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Claim Rewards</h4>
                <p className="text-sm text-gray-400">
                  Upon completion, TUT tokens are automatically distributed to your wallet.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contract Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          <p>
            Training Rewards Contract:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${trainingRewardsAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              {trainingRewardsAddress}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
