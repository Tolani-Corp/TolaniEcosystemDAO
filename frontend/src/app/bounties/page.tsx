"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  Target,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Loader2,
  Award,
  Filter,
  Search,
  ChevronRight,
  Star,
  Briefcase,
} from "lucide-react";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, ABIS, CHAIN_IDS } from "@/config/contracts";

const DIFFICULTY_LEVELS = [
  { level: 0, name: "Trivial", color: "text-green-400", bg: "bg-green-500/20", points: "10 pts" },
  { level: 1, name: "Easy", color: "text-blue-400", bg: "bg-blue-500/20", points: "25 pts" },
  { level: 2, name: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/20", points: "50 pts" },
  { level: 3, name: "Hard", color: "text-orange-400", bg: "bg-orange-500/20", points: "100 pts" },
  { level: 4, name: "Complex", color: "text-red-400", bg: "bg-red-500/20", points: "250 pts" },
];

const TASK_STATUS = [
  { status: 0, name: "Open", color: "text-green-400", bg: "bg-green-500/20" },
  { status: 1, name: "Claimed", color: "text-blue-400", bg: "bg-blue-500/20" },
  { status: 2, name: "Submitted", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { status: 3, name: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  { status: 4, name: "Rejected", color: "text-red-400", bg: "bg-red-500/20" },
  { status: 5, name: "Cancelled", color: "text-gray-400", bg: "bg-gray-500/20" },
];

interface Task {
  id: number;
  title: string;
  description: string;
  reward: bigint;
  deadline: bigint;
  difficulty: number;
  status: number;
  assignee: string;
  creator: string;
  submissionUrl?: string;
}

// Mock tasks for demo
const MOCK_TASKS: Task[] = [
  {
    id: 0,
    title: "Create Social Media Graphics",
    description: "Design 5 social media graphics for Twitter/X promoting the DAO launch. Include TUT branding and key messaging.",
    reward: BigInt("500000000000000000000"), // 500 TUT
    deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
    difficulty: 1,
    status: 0,
    assignee: "0x0000000000000000000000000000000000000000",
    creator: "0x753b53809360bec8742a235D8B60375a57965099",
  },
  {
    id: 1,
    title: "Write DAO Introduction Blog Post",
    description: "Write a comprehensive blog post introducing Tolani Ecosystem DAO, its mission, governance structure, and how to participate.",
    reward: BigInt("750000000000000000000"), // 750 TUT
    deadline: BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60),
    difficulty: 2,
    status: 0,
    assignee: "0x0000000000000000000000000000000000000000",
    creator: "0x753b53809360bec8742a235D8B60375a57965099",
  },
  {
    id: 2,
    title: "Smart Contract Audit Report",
    description: "Perform a security review of the Treasury and Escrow contracts. Document findings and recommendations.",
    reward: BigInt("2000000000000000000000"), // 2000 TUT
    deadline: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    difficulty: 4,
    status: 0,
    assignee: "0x0000000000000000000000000000000000000000",
    creator: "0x753b53809360bec8742a235D8B60375a57965099",
  },
  {
    id: 3,
    title: "Community Discord Setup",
    description: "Set up Discord server with proper channels, roles, and bots for community management.",
    reward: BigInt("300000000000000000000"), // 300 TUT
    deadline: BigInt(Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60),
    difficulty: 0,
    status: 0,
    assignee: "0x0000000000000000000000000000000000000000",
    creator: "0x753b53809360bec8742a235D8B60375a57965099",
  },
  {
    id: 4,
    title: "Tokenomics Documentation",
    description: "Create detailed documentation explaining TUT token distribution, vesting schedules, and utility.",
    reward: BigInt("1000000000000000000000"), // 1000 TUT
    deadline: BigInt(Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60),
    difficulty: 3,
    status: 0,
    assignee: "0x0000000000000000000000000000000000000000",
    creator: "0x753b53809360bec8742a235D8B60375a57965099",
  },
];

export default function BountiesPage() {
  const { address, isConnected } = useAccount();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const chainId = CHAIN_IDS.SEPOLIA;
  const taskBountiesAddress = CONTRACT_ADDRESSES[chainId].taskBounties;

  // Read task count
  const { data: taskCount } = useReadContract({
    address: taskBountiesAddress,
    abi: ABIS.taskBounties,
    functionName: "taskCount",
  });

  // Read total bounties paid
  const { data: totalBountiesPaid } = useReadContract({
    address: taskBountiesAddress,
    abi: ABIS.taskBounties,
    functionName: "totalBountiesPaid",
  });

  const { writeContract: claimTask, data: claimHash } = useWriteContract();
  const { isLoading: isClaimLoading } = useWaitForTransactionReceipt({ hash: claimHash });

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== null && task.status !== filterStatus) return false;
    if (filterDifficulty !== null && task.difficulty !== filterDifficulty) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalRewards = tasks.reduce((acc, t) => acc + Number(formatUnits(t.reward, 18)), 0);
  const openTasks = tasks.filter((t) => t.status === 0).length;

  const stats = [
    {
      label: "Open Bounties",
      value: openTasks.toString(),
      icon: Target,
      color: "text-green-400",
    },
    {
      label: "Total Available",
      value: `${totalRewards.toLocaleString()} TUT`,
      icon: Coins,
      color: "text-yellow-400",
    },
    {
      label: "Bounties Paid",
      value: totalBountiesPaid
        ? `${Number(formatUnits(totalBountiesPaid as bigint, 18)).toLocaleString()} TUT`
        : "0 TUT",
      icon: Award,
      color: "text-purple-400",
    },
    {
      label: "Active Tasks",
      value: tasks.filter((t) => t.status === 1 || t.status === 2).length.toString(),
      icon: Briefcase,
      color: "text-blue-400",
    },
  ];

  const handleClaimTask = async (taskId: number) => {
    if (!address) return;
    
    try {
      claimTask({
        address: taskBountiesAddress,
        abi: ABIS.taskBounties,
        functionName: "claimTask",
        args: [taskId],
      });
    } catch (error) {
      console.error("Claim error:", error);
    }
  };

  const getDifficultyInfo = (level: number) => DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS[0];
  const getStatusInfo = (status: number) => TASK_STATUS[status] || TASK_STATUS[0];

  const formatDeadline = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Expired";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 mb-4">
            <Target className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent mb-4">
            Task Bounties
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Contribute to the Tolani Ecosystem by completing tasks and earn TUT tokens.
            Browse available bounties, claim tasks, and submit your work for review.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1a1a2e] rounded-xl p-4 border border-orange-500/20"
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
            <p className="text-yellow-400 font-medium">Connect your wallet to claim bounties</p>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1a2e] rounded-xl border border-orange-500/20 p-4 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bounties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 items-center">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus ?? ""}
                onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) : null)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none transition"
              >
                <option value="">All Status</option>
                {TASK_STATUS.slice(0, 4).map((s) => (
                  <option key={s.status} value={s.status}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-2 items-center">
              <Star className="w-5 h-5 text-gray-400" />
              <select
                value={filterDifficulty ?? ""}
                onChange={(e) => setFilterDifficulty(e.target.value ? Number(e.target.value) : null)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus:border-orange-500 focus:outline-none transition"
              >
                <option value="">All Difficulty</option>
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d.level} value={d.level}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Task List */}
        <div className="space-y-4">
          {filteredTasks.map((task, index) => {
            const difficulty = getDifficultyInfo(task.difficulty);
            const status = getStatusInfo(task.status);
            const deadline = formatDeadline(task.deadline);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-[#1a1a2e] rounded-xl border border-orange-500/20 overflow-hidden hover:border-orange-500/40 transition-all"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                          {status.name}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{task.description}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className={`flex items-center gap-1 ${difficulty.color}`}>
                          <Star className="w-4 h-4" />
                          <span>{difficulty.name}</span>
                          <span className="text-gray-500">({difficulty.points})</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{deadline}</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Coins className="w-4 h-4" />
                          <span>{formatUnits(task.reward, 18)} TUT</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {task.status === 0 && (
                        <button
                          onClick={() => handleClaimTask(task.id)}
                          disabled={!isConnected || isClaimLoading}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isClaimLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Claim Task
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                      {task.status === 1 && task.assignee === address && (
                        <button
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium flex items-center gap-2 transition-all"
                        >
                          Submit Work
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === 3 && (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bounties found matching your filters</p>
            </div>
          )}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-gradient-to-r from-orange-900/20 to-amber-900/20 rounded-xl border border-orange-500/20 p-6"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-400" />
            How Bounties Work
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Browse & Claim</h4>
                <p className="text-sm text-gray-400">
                  Find a task that matches your skills and claim it to start working.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Complete Work</h4>
                <p className="text-sm text-gray-400">
                  Work on the task according to the requirements and deadline.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Submit & Review</h4>
                <p className="text-sm text-gray-400">
                  Submit your work for review by the task managers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                4
              </div>
              <div>
                <h4 className="font-medium mb-1">Get Paid</h4>
                <p className="text-sm text-gray-400">
                  Upon approval, receive TUT tokens and reputation points.
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
            Task Bounties Contract:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${taskBountiesAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 transition"
            >
              {taskBountiesAddress}
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
