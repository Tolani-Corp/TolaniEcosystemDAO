"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Video,
  ExternalLink,
  Wallet,
  Vote,
  Shield,
  Coins,
  Users,
  FileText,
  Globe,
  Code,
  Lightbulb,
  Award,
} from "lucide-react";

const learningPaths = [
  {
    title: "Web3 Fundamentals",
    description: "Start your journey into decentralized technology",
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
    courses: [
      {
        name: "What is Blockchain?",
        url: "https://ethereum.org/en/what-is-ethereum/",
        type: "article",
        duration: "10 min",
      },
      {
        name: "Web3 Introduction",
        url: "https://ethereum.org/en/web3/",
        type: "article",
        duration: "15 min",
      },
      {
        name: "Crypto Wallets Explained",
        url: "https://ethereum.org/en/wallets/",
        type: "article",
        duration: "10 min",
      },
      {
        name: "Web3 University",
        url: "https://www.web3.university/",
        type: "course",
        duration: "Self-paced",
      },
    ],
  },
  {
    title: "DAO Governance",
    description: "Learn how decentralized organizations work",
    icon: Vote,
    color: "from-violet-500 to-purple-500",
    courses: [
      {
        name: "What is a DAO?",
        url: "https://ethereum.org/en/dao/",
        type: "article",
        duration: "15 min",
      },
      {
        name: "DAO Governance Frameworks",
        url: "https://docs.openzeppelin.com/contracts/5.x/governance",
        type: "docs",
        duration: "30 min",
      },
      {
        name: "Voting & Delegation",
        url: "https://docs.tally.xyz/user-guides/start-participating",
        type: "guide",
        duration: "20 min",
      },
      {
        name: "DAO Treasury Management",
        url: "https://mirror.xyz/0x56BcD233aFC2d67D05aEfc6b8aCE4B08FC5d71E4/F0hy6Uy0q9rWz7KNxFLAe1y8cS5aQxXMsNzj7a7U3qU",
        type: "article",
        duration: "20 min",
      },
    ],
  },
  {
    title: "DeFi Basics",
    description: "Understand decentralized finance concepts",
    icon: Coins,
    color: "from-amber-500 to-orange-500",
    courses: [
      {
        name: "Introduction to DeFi",
        url: "https://ethereum.org/en/defi/",
        type: "article",
        duration: "20 min",
      },
      {
        name: "What are Smart Contracts?",
        url: "https://ethereum.org/en/smart-contracts/",
        type: "article",
        duration: "15 min",
      },
      {
        name: "DeFi Llama Learn",
        url: "https://defillama.com/docs",
        type: "docs",
        duration: "30 min",
      },
      {
        name: "Finematics (YouTube)",
        url: "https://www.youtube.com/@Finematics",
        type: "video",
        duration: "Various",
      },
    ],
  },
  {
    title: "Security & Safety",
    description: "Protect yourself in the Web3 ecosystem",
    icon: Shield,
    color: "from-emerald-500 to-green-500",
    courses: [
      {
        name: "Wallet Security Best Practices",
        url: "https://ethereum.org/en/security/",
        type: "article",
        duration: "15 min",
      },
      {
        name: "Common Scams & How to Avoid Them",
        url: "https://support.metamask.io/hc/en-us/articles/4412217080091-Common-scams-and-how-to-avoid-them",
        type: "guide",
        duration: "20 min",
      },
      {
        name: "Smart Contract Security",
        url: "https://consensys.github.io/smart-contract-best-practices/",
        type: "docs",
        duration: "45 min",
      },
      {
        name: "Rekt News (Security Incidents)",
        url: "https://rekt.news/",
        type: "news",
        duration: "Ongoing",
      },
    ],
  },
];

const externalResources = [
  {
    name: "Ethereum.org",
    description: "Official Ethereum documentation and learning resources",
    url: "https://ethereum.org/en/learn/",
    icon: Globe,
  },
  {
    name: "CryptoZombies",
    description: "Interactive Solidity tutorial - learn by building games",
    url: "https://cryptozombies.io/",
    icon: Code,
  },
  {
    name: "Bankless Academy",
    description: "Free courses on crypto, DeFi, and Web3",
    url: "https://app.banklessacademy.com/",
    icon: GraduationCap,
  },
  {
    name: "Rabbithole",
    description: "Learn by doing - earn rewards for on-chain actions",
    url: "https://rabbithole.gg/",
    icon: Award,
  },
  {
    name: "Tally",
    description: "Governance platform - see live DAOs in action",
    url: "https://www.tally.xyz/",
    icon: Vote,
  },
  {
    name: "DefiLlama",
    description: "Track DeFi protocols and understand the ecosystem",
    url: "https://defillama.com/",
    icon: Coins,
  },
];

const quickTips = [
  {
    icon: Wallet,
    title: "Set Up a Wallet",
    description: "Start with MetaMask or Rainbow - your gateway to Web3",
  },
  {
    icon: Users,
    title: "Delegate Your Votes",
    description: "Even if you can't vote on every proposal, delegate to someone who will",
  },
  {
    icon: FileText,
    title: "Read Proposals Carefully",
    description: "Understand what you're voting for - check the forum discussions",
  },
  {
    icon: Lightbulb,
    title: "Start Small",
    description: "Use testnets to practice before using real funds",
  },
];

export default function LearnPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
          <GraduationCap className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-violet-400">Learning Portal</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Web3 & DAO Training Center
        </h1>
        <p className="text-gray-400 text-lg">
          Everything you need to understand decentralized governance, Web3 technology,
          and how to participate effectively in the Tolani Ecosystem DAO.
        </p>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickTips.map((tip, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-violet-500/30 transition-colors"
          >
            <tip.icon className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">{tip.title}</h3>
            <p className="text-sm text-gray-400">{tip.description}</p>
          </div>
        ))}
      </motion.div>

      {/* Learning Paths */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Learning Paths</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {learningPaths.map((path, pathIndex) => (
            <motion.div
              key={path.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * pathIndex }}
              className="p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${path.color}`}>
                  <path.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{path.title}</h3>
                  <p className="text-gray-400">{path.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {path.courses.map((course, courseIndex) => (
                  <a
                    key={courseIndex}
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900/80 border border-gray-700/30 hover:border-violet-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {course.type === "video" ? (
                        <Video className="w-4 h-4 text-red-400" />
                      ) : course.type === "course" ? (
                        <GraduationCap className="w-4 h-4 text-green-400" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        {course.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{course.duration}</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* External Resources */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Recommended Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {externalResources.map((resource, index) => (
            <motion.a
              key={resource.name}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-violet-500/30 hover:bg-gray-800/50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <resource.icon className="w-5 h-5 text-violet-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {resource.name}
                    </h3>
                    <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{resource.description}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Tolani DAO Specific */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-violet-600/10 to-purple-600/10 border border-violet-500/20"
      >
        <h2 className="text-2xl font-bold text-white mb-4">Tolani DAO Governance Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-violet-400 mb-2">1. Get TUT Tokens</h3>
            <p className="text-sm text-gray-400">
              TUT is the governance token. Hold TUT to participate in voting and proposal creation.
              Current threshold: 100,000 TUT to create proposals.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-violet-400 mb-2">2. Delegate Your Votes</h3>
            <p className="text-sm text-gray-400">
              Before voting, you must delegate your voting power. You can delegate to yourself
              or to another address you trust. Visit the Delegates page to get started.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-violet-400 mb-2">3. Participate!</h3>
            <p className="text-sm text-gray-400">
              Review proposals, cast your votes (For, Against, or Abstain), and help shape
              the future of the Tolani ecosystem. Every vote counts!
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/delegates"
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Delegate Votes →
          </a>
          <a
            href="/proposals"
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          >
            View Proposals →
          </a>
          <a
            href="https://sepolia.etherscan.io/address/0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            TUT Contract <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {/* Footer Note */}
      <div className="text-center text-gray-500 text-sm">
        <p>
          These resources are provided for educational purposes. Always do your own research (DYOR)
          before making any decisions in the Web3 space.
        </p>
      </div>
    </div>
  );
}
