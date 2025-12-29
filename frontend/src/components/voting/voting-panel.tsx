"use client";

import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, MinusCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VotingPanelProps {
  proposalId: string;
  hasVoted: boolean;
  userVote?: number;
  onVote: (support: number, reason?: string) => Promise<void>;
}

export function VotingPanel({
  proposalId,
  hasVoted,
  userVote,
  onVote,
}: VotingPanelProps) {
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isVoting, setIsVoting] = useState(false);

  const voteOptions = [
    {
      value: 1,
      label: "For",
      icon: ThumbsUp,
      gradient: "from-green-500 to-emerald-600",
      bgHover: "hover:bg-green-500/20",
      border: "border-green-500/30",
      text: "text-green-400",
    },
    {
      value: 0,
      label: "Against",
      icon: ThumbsDown,
      gradient: "from-red-500 to-pink-600",
      bgHover: "hover:bg-red-500/20",
      border: "border-red-500/30",
      text: "text-red-400",
    },
    {
      value: 2,
      label: "Abstain",
      icon: MinusCircle,
      gradient: "from-gray-500 to-gray-600",
      bgHover: "hover:bg-gray-500/20",
      border: "border-gray-500/30",
      text: "text-gray-400",
    },
  ];

  const handleVote = async () => {
    if (selectedVote === null) return;
    setIsVoting(true);
    try {
      await onVote(selectedVote, reason);
    } finally {
      setIsVoting(false);
    }
  };

  if (hasVoted) {
    const votedOption = voteOptions.find((o) => o.value === userVote);
    return (
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6">
        <div className="text-center">
          <div
            className={cn(
              "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
              `bg-gradient-to-br ${votedOption?.gradient}`
            )}
          >
            {votedOption && <votedOption.icon className="w-8 h-8 text-white" />}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            You voted {votedOption?.label}
          </h3>
          <p className="text-sm text-gray-400">
            Your vote has been recorded on-chain and cannot be changed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 overflow-hidden">
      <div className="p-6 border-b border-gray-800/50">
        <h3 className="text-lg font-semibold text-white">Cast Your Vote</h3>
        <p className="text-sm text-gray-400 mt-1">
          Select your vote and optionally provide a reason
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Vote Options */}
        <div className="grid grid-cols-3 gap-3">
          {voteOptions.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedVote(option.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
                selectedVote === option.value
                  ? `bg-gradient-to-br ${option.gradient} border-transparent`
                  : `bg-gray-800/30 ${option.border} ${option.bgHover}`
              )}
            >
              <option.icon
                className={cn(
                  "w-6 h-6",
                  selectedVote === option.value ? "text-white" : option.text
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  selectedVote === option.value ? "text-white" : option.text
                )}
              >
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Share why you're voting this way..."
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleVote}
          disabled={selectedVote === null || isVoting}
          isLoading={isVoting}
          className="w-full"
          size="lg"
        >
          {isVoting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Vote...
            </>
          ) : (
            "Submit Vote"
          )}
        </Button>
      </div>
    </div>
  );
}
