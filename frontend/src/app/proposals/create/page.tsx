"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { useAccount } from "wagmi";

export default function CreateProposalPage() {
  const { isConnected } = useAccount();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    targetContract: "",
    functionSignature: "",
    callData: "",
    value: "0",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: Implement proposal creation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white">Create Proposal</h1>
        <p className="text-gray-400 mt-1">
          Submit a new governance proposal for the community to vote on
        </p>
      </div>

      {/* Requirements Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
      >
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-yellow-400">Requirements</h4>
          <p className="text-sm text-gray-400 mt-1">
            You need at least <span className="text-white font-medium">100,000 TUT</span> voting
            power to create a proposal. Make sure to delegate your tokens to yourself if you
            haven&apos;t already.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <GlassCard>
          <CardHeader
            title="Proposal Details"
            description="Provide the details for your governance proposal"
          />
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proposal Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="TIP-XX: Your proposal title"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
              >
                <option value="general">General</option>
                <option value="treasury">Treasury</option>
                <option value="protocol">Protocol Upgrade</option>
                <option value="partnership">Partnership</option>
                <option value="governance">Governance</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your proposal in detail. Include motivation, specification, and any relevant information..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none"
                rows={8}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Supports Markdown formatting
              </p>
            </div>
          </CardContent>
        </GlassCard>

        {/* Actions Section */}
        <GlassCard className="mt-6">
          <CardHeader
            title="On-Chain Actions"
            description="Specify the contract calls this proposal will execute (optional)"
          />
          <CardContent className="space-y-6">
            {/* Target Contract */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Contract Address
              </label>
              <input
                type="text"
                value={formData.targetContract}
                onChange={(e) =>
                  setFormData({ ...formData, targetContract: e.target.value })
                }
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
              />
            </div>

            {/* Function */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Function Signature
              </label>
              <input
                type="text"
                value={formData.functionSignature}
                onChange={(e) =>
                  setFormData({ ...formData, functionSignature: e.target.value })
                }
                placeholder="transfer(address,uint256)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
              />
            </div>

            {/* Calldata */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Call Data (hex)
              </label>
              <input
                type="text"
                value={formData.callData}
                onChange={(e) =>
                  setFormData({ ...formData, callData: e.target.value })
                }
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
              />
            </div>

            {/* Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ETH Value
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 pr-16 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ETH
                </span>
              </div>
            </div>
          </CardContent>
        </GlassCard>

        {/* Submit */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/50">
          <p className="text-sm text-gray-400">
            <FileText className="w-4 h-4 inline-block mr-1" />
            Preview your proposal before submitting
          </p>
          <div className="flex gap-4">
            <Button variant="secondary" type="button">
              Preview
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!isConnected || !formData.title || !formData.description}
            >
              {!isConnected ? "Connect Wallet" : "Submit Proposal"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
