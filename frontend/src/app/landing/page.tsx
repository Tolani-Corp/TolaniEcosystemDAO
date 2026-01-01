"use client";

import React, { JSX } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Coins,
  Shield,
  Vote,
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Target,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";

const BRAND_COLORS = {
  baseTeal: "#004D4D",
  highlightTeal: "#007373",
  gold: "#E5C64B",
  circuit: "#00AFAF",
};

const features = [
  {
    icon: Vote,
    title: "Decentralized Governance",
    description: "Participate in DAO decisions. Every TUT holder has a voice in shaping the ecosystem's future.",
  },
  {
    icon: Coins,
    title: "Multi-Tier Staking",
    description: "Earn rewards through flexible staking tiers. From Flexible to Diamond, choose your commitment level.",
  },
  {
    icon: Shield,
    title: "Secure & Audited",
    description: "Built on battle-tested OpenZeppelin contracts with comprehensive security measures.",
  },
  {
    icon: TrendingUp,
    title: "DeFi Integration",
    description: "Access liquidity pools, yield farming, and advanced DeFi features within the ecosystem.",
  },
  {
    icon: BookOpen,
    title: "Learn & Earn",
    description: "Complete training modules and earn TUT rewards through our educational platform.",
  },
  {
    icon: Target,
    title: "Task Bounties",
    description: "Contribute to the ecosystem and earn TUT by completing L.O.E tasks and bounties.",
  },
];

const tokenomics = [
  { label: "Training Rewards", percentage: 15, color: BRAND_COLORS.gold },
  { label: "Task Bounties", percentage: 10, color: BRAND_COLORS.highlightTeal },
  { label: "Ecosystem Grants", percentage: 20, color: BRAND_COLORS.circuit },
  { label: "Community Incentives", percentage: 15, color: "#00CED1" },
  { label: "Reserve", percentage: 10, color: "#20B2AA" },
  { label: "Tolani Foundation", percentage: 15, color: BRAND_COLORS.baseTeal },
  { label: "Liquidity & Staking", percentage: 15, color: "#008B8B" },
];

const stats = [
  { label: "Total Supply", value: "1,000,000,000", suffix: "TUT" },
  { label: "Staking APY", value: "Up to 300%", suffix: "" },
  { label: "Governance Power", value: "1 TUT", suffix: "= 1 Vote" },
  { label: "Networks", value: "Ethereum", suffix: "+ L2s" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-[#007373]/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004D4D] via-[#007373] to-[#00AFAF] flex items-center justify-center shadow-lg shadow-[#007373]/25">
                <span className="text-xl font-bold text-[#E5C64B]">☥</span>
              </div>
              <div>
                <h1 className="font-bold text-[#E5C64B] text-lg">TUT Token</h1>
                <p className="text-xs text-[#00AFAF]">Tolani Utility Token</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-[#E5C64B] transition-colors">Features</a>
              <a href="#tokenomics" className="text-gray-300 hover:text-[#E5C64B] transition-colors">Tokenomics</a>
              <a href="#ecosystem" className="text-gray-300 hover:text-[#E5C64B] transition-colors">Ecosystem</a>
              <a href="https://dao.tuttoken.pw" className="text-gray-300 hover:text-[#E5C64B] transition-colors">DAO</a>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://dao.tuttoken.pw"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E5C64B] to-[#c9a93f] text-[#004D4D] font-semibold hover:shadow-lg hover:shadow-[#E5C64B]/25 transition-all"
              >
                Launch App
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#004D4D]/20 via-transparent to-[#007373]/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007373]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#E5C64B]/10 rounded-full blur-[100px]" />
        
        {/* Circuit Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="circuit" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 H8 M12 10 H20 M10 0 V8 M10 12 V20" stroke="#00AFAF" strokeWidth="0.5" fill="none" />
              <circle cx="10" cy="10" r="2" fill="#00AFAF" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#circuit)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#004D4D]/40 border border-[#E5C64B]/30 mb-8">
              <Sparkles className="w-4 h-4 text-[#E5C64B]" />
              <span className="text-[#E5C64B] text-sm font-medium">Powering the Tolani Ecosystem</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-white">The </span>
              <span className="text-[#E5C64B]">Tolani</span>
              <br />
              <span className="bg-gradient-to-r from-[#007373] via-[#00AFAF] to-[#E5C64B] bg-clip-text text-transparent">
                Utility Token
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10">
              Governance, staking, rewards, and DeFi — all powered by TUT. 
              Join the decentralized ecosystem shaping the future of community-driven finance.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a
                href="https://dao.tuttoken.pw"
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-[#E5C64B] to-[#c9a93f] text-[#004D4D] font-bold text-lg hover:shadow-xl hover:shadow-[#E5C64B]/30 transition-all flex items-center gap-2"
              >
                Enter DAO
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#tokenomics"
                className="px-8 py-4 rounded-xl border-2 border-[#007373] text-[#00AFAF] font-bold text-lg hover:bg-[#007373]/20 transition-all flex items-center gap-2"
              >
                View Tokenomics
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="p-6 rounded-2xl bg-[#004D4D]/20 border border-[#007373]/30 backdrop-blur-sm"
                >
                  <p className="text-2xl md:text-3xl font-bold text-[#E5C64B]">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.suffix}</p>
                  <p className="text-xs text-[#00AFAF] mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 rounded-full border-2 border-[#007373]/50 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-3 rounded-full bg-[#E5C64B]" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-[#E5C64B] mb-4">Ecosystem Features</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              TUT powers a complete decentralized ecosystem with governance, staking, and rewards
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 rounded-2xl bg-gradient-to-br from-[#004D4D]/20 to-transparent border border-[#007373]/20 hover:border-[#E5C64B]/30 transition-all hover:shadow-xl hover:shadow-[#007373]/10"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#007373] to-[#00AFAF] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-[#E5C64B]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section id="tokenomics" className="py-24 relative bg-[#004D4D]/10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-[#E5C64B] mb-4">Tokenomics</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Designed for sustainable growth and community empowerment
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square max-w-md mx-auto relative">
                {/* Circular Progress */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {tokenomics.reduce((acc, item, index) => {
                    const offset = tokenomics.slice(0, index).reduce((sum, t) => sum + t.percentage, 0);
                    acc.push(
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="16"
                        strokeDasharray={`${item.percentage * 2.51} 251`}
                        strokeDashoffset={-offset * 2.51}
                        className="transition-all duration-500"
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#E5C64B]">1B</p>
                    <p className="text-sm text-gray-400">Total Supply</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {tokenomics.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-[#004D4D]/20 border border-[#007373]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-white font-medium">{item.label}</span>
                  </div>
                  <span className="text-[#E5C64B] font-bold">{item.percentage}%</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section id="ecosystem" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-[#E5C64B] mb-4">The Tolani Ecosystem</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A complete suite of decentralized applications powered by TUT
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Tolani DAO",
                description: "Decentralized governance platform for community proposals and voting",
                icon: Vote,
                link: "https://dao.tuttoken.pw",
                color: BRAND_COLORS.gold,
              },
              {
                title: "Staking Platform",
                description: "Multi-tier staking with rewards up to 300% APY for Diamond tier",
                icon: Lock,
                link: "https://dao.tuttoken.pw/staking",
                color: BRAND_COLORS.highlightTeal,
              },
              {
                title: "Training Hub",
                description: "Learn and earn through educational modules and certifications",
                icon: BookOpen,
                link: "https://dao.tuttoken.pw/training",
                color: BRAND_COLORS.circuit,
              },
            ].map((item, index) => (
              <motion.a
                key={item.title}
                href={item.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 rounded-2xl bg-gradient-to-br from-[#004D4D]/30 to-[#007373]/10 border border-[#007373]/30 hover:border-[#E5C64B]/40 transition-all hover:shadow-2xl hover:shadow-[#007373]/20 hover:-translate-y-1"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                  {item.title}
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#E5C64B] transition-colors" />
                </h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004D4D]/40 via-[#007373]/20 to-[#00AFAF]/30" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Join the <span className="text-[#E5C64B]">Revolution</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              Start participating in governance, earn rewards through staking, and help shape the future of decentralized finance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://dao.tuttoken.pw"
                className="group px-10 py-4 rounded-xl bg-gradient-to-r from-[#E5C64B] to-[#c9a93f] text-[#004D4D] font-bold text-lg hover:shadow-xl hover:shadow-[#E5C64B]/30 transition-all flex items-center gap-2"
              >
                Launch App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://docs.tuttoken.pw"
                className="px-10 py-4 rounded-xl border-2 border-[#E5C64B]/50 text-[#E5C64B] font-bold text-lg hover:bg-[#E5C64B]/10 transition-all"
              >
                Read Docs
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#007373]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004D4D] via-[#007373] to-[#00AFAF] flex items-center justify-center">
                  <span className="text-xl font-bold text-[#E5C64B]">☥</span>
                </div>
                <div>
                  <h1 className="font-bold text-[#E5C64B]">TUT Token</h1>
                  <p className="text-xs text-[#00AFAF]">Tolani Utility Token</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                TUT is the native governance and utility token of the Tolani Ecosystem, 
                enabling decentralized decision-making, staking rewards, and community incentives.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Ecosystem</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://dao.tuttoken.pw" className="text-gray-400 hover:text-[#E5C64B] transition-colors">DAO Governance</a></li>
                <li><a href="https://dao.tuttoken.pw/staking" className="text-gray-400 hover:text-[#E5C64B] transition-colors">Staking</a></li>
                <li><a href="https://dao.tuttoken.pw/training" className="text-gray-400 hover:text-[#E5C64B] transition-colors">Training</a></li>
                <li><a href="https://dao.tuttoken.pw/bounties" className="text-gray-400 hover:text-[#E5C64B] transition-colors">Bounties</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://docs.tuttoken.pw" className="text-gray-400 hover:text-[#E5C64B] transition-colors">Documentation</a></li>
                <li><a href="https://github.com/Tolani-Corp" className="text-gray-400 hover:text-[#E5C64B] transition-colors">GitHub</a></li>
                <li><a href="https://sepolia.etherscan.io/token/0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6" className="text-gray-400 hover:text-[#E5C64B] transition-colors">Token Contract</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#007373]/20">
            <p className="text-gray-500 text-sm">
              © 2025 Tolani Foundation. All rights reserved.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-[#E5C64B] transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
