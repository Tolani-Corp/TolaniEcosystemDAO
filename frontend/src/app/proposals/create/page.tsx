"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { useAccount } from "wagmi";
import { useVotingPower, useGovernorParams, useCreateProposal } from "@/hooks/useGovernance";
import { useContracts } from "@/hooks/useContracts";
import { formatNumber, cn } from "@/lib/utils";
import { encodeFunctionData, parseEther, parseUnits } from "viem";

export default function CreateProposalPage() {
  const { isConnected, address } = useAccount();
  const contracts = useContracts();
  const { votingPowerFormatted, isLoading: votingLoading } = useVotingPower();
  const { proposalThresholdFormatted } = useGovernorParams();
  const { propose, isPending, isConfirming, isSuccess, error, hash } = useCreateProposal();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    actionType: "none",
    targetContract: "",
    functionSignature: "",
    callData: "",
    recipient: "",
    amount: "",
    value: "0",
  });

  const hasEnoughVotingPower = parseFloat(votingPowerFormatted) >= parseFloat(proposalThresholdFormatted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    let targets: string[] = [];
    let values: bigint[] = [];
    let calldatas: string[] = [];

    // Build the proposal based on action type
    if (formData.actionType === "transfer" && formData.recipient && formData.amount) {
      // Treasury token transfer proposal
      const transferCalldata = encodeFunctionData({
        abi: [
          {
            name: "transfer",
            type: "function",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" }
            ],
            outputs: [{ type: "bool" }]
          }
        ],
        functionName: "transfer",
        args: [formData.recipient as `0x${string}`, parseUnits(formData.amount, 18)]
      });

      targets = [contracts.token.address];
      values = [BigInt(0)];
      calldatas = [transferCalldata];
    } else if (formData.actionType === "custom" && formData.targetContract && formData.callData) {
      targets = [formData.targetContract as `0x${string}`];
      values = [parseEther(formData.value || "0")];
      calldatas = [formData.callData as `0x${string}`];
    } else {
      // Empty proposal (signaling only)
      targets = [contracts.governor.address];
      values = [BigInt(0)];
      calldatas = ["0x"];
    }

    const description = `# ${formData.title}\n\n**Category:** ${formData.category}\n\n${formData.description}`;

    propose(targets, values, calldatas, description);
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

      {/* Transaction Status */}
      {(isPending || isConfirming || isSuccess || error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border",
            isPending || isConfirming ? "bg-blue-500/10 border-blue-500/20" :
            isSuccess ? "bg-green-500/10 border-green-500/20" :
            "bg-red-500/10 border-red-500/20"
          )}
        >
          <div className="flex items-center gap-3">
            {(isPending || isConfirming) && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
            {isSuccess && <CheckCircle className="w-5 h-5 text-green-400" />}
            {error && <AlertTriangle className="w-5 h-5 text-red-400" />}
            <div>
              <p className={cn(
                "font-medium",
                isPending || isConfirming ? "text-blue-400" :
                isSuccess ? "text-green-400" :
                "text-red-400"
              )}>
                {isPending && "Waiting for wallet confirmation..."}
                {isConfirming && "Transaction confirming..."}
                {isSuccess && "Proposal created successfully!"}
                {error && `Error: ${error.message}`}
              </p>
              {hash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white"
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Requirements Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-start gap-4 p-4 rounded-xl border",
          hasEnoughVotingPower 
            ? "bg-green-500/10 border-green-500/20" 
            : "bg-yellow-500/10 border-yellow-500/20"
        )}
      >
        {hasEnoughVotingPower ? (
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className={cn(
            "font-medium",
            hasEnoughVotingPower ? "text-green-400" : "text-yellow-400"
          )}>
            {hasEnoughVotingPower ? "Ready to Create" : "Requirements Not Met"}
          </h4>
          <p className="text-sm text-gray-400 mt-1">
            You need at least <span className="text-white font-medium">{formatNumber(parseFloat(proposalThresholdFormatted))} TUT</span> voting power. 
            {votingLoading ? (
              " Loading your balance..."
            ) : (
              <> You have <span className="text-white font-medium">{formatNumber(parseFloat(votingPowerFormatted))} TUT</span>.</>
            )}
          </p>
          {!hasEnoughVotingPower && (
            <Link href="/delegates" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
              Delegate to yourself to activate voting power →
            </Link>
          )}
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
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            description="What should happen if this proposal passes?"
          />
          <CardContent className="space-y-6">
            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Action Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: "none", label: "Signaling Only", desc: "No on-chain action" },
                  { value: "transfer", label: "Token Transfer", desc: "Send TUT from treasury" },
                  { value: "custom", label: "Custom Action", desc: "Advanced contract call" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, actionType: option.value })}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      formData.actionType === option.value
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-gray-700/50 hover:border-gray-600"
                    )}
                  >
                    <p className="font-medium text-white">{option.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer Fields */}
            {formData.actionType === "transfer" && (
              <div className="space-y-4 p-4 rounded-xl bg-gray-800/30">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Address *
                  </label>
                  <input
                    type="text"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (TUT) *
                  </label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="1000"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            )}

            {/* Custom Action Fields */}
            {formData.actionType === "custom" && (
              <div className="space-y-4 p-4 rounded-xl bg-gray-800/30">
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm text-yellow-400">Advanced: Requires knowledge of contract ABIs</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Contract Address *
                  </label>
                  <input
                    type="text"
                    value={formData.targetContract}
                    onChange={(e) => setFormData({ ...formData, targetContract: e.target.value })}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Call Data (hex) *
                  </label>
                  <input
                    type="text"
                    value={formData.callData}
                    onChange={(e) => setFormData({ ...formData, callData: e.target.value })}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ETH Value (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </GlassCard>

        {/* Submit */}
        <div className="mt-8 flex gap-4">
          <Link href="/proposals" className="flex-1">
            <Button variant="secondary" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1"
            disabled={!isConnected || !hasEnoughVotingPower || isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? "Confirm in Wallet..." : "Creating..."}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Proposal
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
