"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Users, Award, TrendingUp, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent, StatCard } from "@/components/ui/cards";
import { formatNumber, cn, formatAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import { 
  useVotingPower, 
  useTokenBalance, 
  useDelegate,
  useDelegateVotes,
} from "@/hooks/useGovernance";

export default function DelegatesPage() {
  const { isConnected, address } = useAccount();
  const { votingPowerFormatted, isLoading: votingLoading, refetch: refetchVoting } = useVotingPower();
  const { balanceFormatted, isLoading: balanceLoading } = useTokenBalance();
  const { delegate, hasDelegated, isSelfDelegated, isLoading: delegateLoading, refetch: refetchDelegate } = useDelegate();
  const { delegate: delegateTo, isPending, isConfirming, isSuccess, error, hash } = useDelegateVotes();
  
  const [customAddress, setCustomAddress] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelfDelegate = () => {
    if (address) {
      delegateTo(address);
    }
  };

  const handleDelegateToAddress = () => {
    if (customAddress && customAddress.startsWith("0x") && customAddress.length === 42) {
      delegateTo(customAddress);
      setShowCustomInput(false);
      setCustomAddress("");
    }
  };

  // Refresh data after successful delegation
  if (isSuccess) {
    setTimeout(() => {
      refetchVoting();
      refetchDelegate();
    }, 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Delegate Votes</h1>
          <p className="text-gray-400 mt-1">
            Delegate your voting power to participate in governance
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Your TUT Balance"
          value={balanceLoading ? "Loading..." : `${formatNumber(parseFloat(balanceFormatted))} TUT`}
          change="Token balance"
          changeType="neutral"
          icon={Users}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          title="Your Voting Power"
          value={votingLoading ? "Loading..." : `${formatNumber(parseFloat(votingPowerFormatted))} TUT`}
          change={hasDelegated ? "Delegated" : "Not delegated"}
          changeType={hasDelegated ? "positive" : "neutral"}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Delegation Status"
          value={delegateLoading ? "Loading..." : (isSelfDelegated ? "Self" : (hasDelegated ? "Delegated" : "None"))}
          change={delegate ? formatAddress(delegate) : "Not set"}
          changeType={hasDelegated ? "positive" : "neutral"}
          icon={Award}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
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
            {error && <AlertCircle className="w-5 h-5 text-red-400" />}
            <div>
              <p className={cn(
                "font-medium",
                isPending || isConfirming ? "text-blue-400" :
                isSuccess ? "text-green-400" :
                "text-red-400"
              )}>
                {isPending && "Waiting for wallet confirmation..."}
                {isConfirming && "Transaction confirming..."}
                {isSuccess && "Delegation successful!"}
                {error && "Delegation failed"}
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

      {/* Your Delegation Card */}
      <GlassCard>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Users className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Your Delegation Status
                </h3>
                {!isConnected ? (
                  <p className="text-gray-400">Connect wallet to manage delegation</p>
                ) : delegateLoading ? (
                  <p className="text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </p>
                ) : hasDelegated ? (
                  <p className="text-gray-400">
                    {isSelfDelegated 
                      ? "You've delegated to yourself" 
                      : `Delegated to ${formatAddress(delegate!)}`}
                  </p>
                ) : (
                  <p className="text-yellow-400">
                    ⚠️ You need to delegate to activate voting power
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Your Voting Power</p>
                <p className="text-2xl font-bold text-white">
                  {votingLoading ? "..." : formatNumber(parseFloat(votingPowerFormatted))} TUT
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Delegation Actions */}
      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Self Delegate */}
          <GlassCard>
            <CardHeader
              title="Self Delegate"
              description="Delegate voting power to yourself to vote directly on proposals"
            />
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                Self-delegating allows you to participate directly in governance. Your full token balance will become voting power.
              </p>
              <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-sm text-gray-300">
                  <span className="text-violet-400 font-medium">Tip:</span> You must delegate (either to yourself or another address) before your tokens count as voting power.
                </p>
              </div>
              <Button 
                onClick={handleSelfDelegate}
                disabled={isPending || isConfirming || isSelfDelegated}
                className="w-full"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isSelfDelegated ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Already Self-Delegated
                  </>
                ) : (
                  "Delegate to Myself"
                )}
              </Button>
            </CardContent>
          </GlassCard>

          {/* Delegate to Address */}
          <GlassCard>
            <CardHeader
              title="Delegate to Address"
              description="Delegate your voting power to a trusted community member"
            />
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                If you can't actively participate, delegate to someone who will vote in the ecosystem's best interest.
              </p>
              
              {showCustomInput ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0x... (Ethereum address)"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDelegateToAddress}
                      disabled={isPending || isConfirming || !customAddress || customAddress.length !== 42}
                      className="flex-1"
                    >
                      {isPending || isConfirming ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Delegate"
                      )}
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomAddress("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="secondary"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full"
                >
                  Enter Address to Delegate
                </Button>
              )}
            </CardContent>
          </GlassCard>
        </div>
      )}

      {/* How Delegation Works */}
      <GlassCard>
        <CardHeader
          title="How Delegation Works"
          description="Understanding voting power in governance"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-gray-800/30">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-3">
                <span className="text-violet-400 font-bold">1</span>
              </div>
              <h4 className="font-medium text-white mb-2">Hold TUT Tokens</h4>
              <p className="text-sm text-gray-400">
                Your TUT token balance determines your potential voting power in the DAO.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-800/30">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <h4 className="font-medium text-white mb-2">Delegate Votes</h4>
              <p className="text-sm text-gray-400">
                Delegate to yourself or a trusted address to activate voting power.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-800/30">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                <span className="text-emerald-400 font-bold">3</span>
              </div>
              <h4 className="font-medium text-white mb-2">Participate</h4>
              <p className="text-sm text-gray-400">
                Vote on proposals or create new ones if you meet the threshold.
              </p>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Not Connected State */}
      {!isConnected && (
        <GlassCard>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                Connect your wallet to view your delegation status and delegate your voting power.
              </p>
            </div>
          </CardContent>
        </GlassCard>
      )}
    </div>
  );
}
