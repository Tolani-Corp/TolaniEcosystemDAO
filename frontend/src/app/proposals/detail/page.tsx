'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown, 
  MinusCircle,
  Timer,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Users,
  Clock,
  XCircle,
  Hourglass,
  Archive,
  Ban
} from 'lucide-react';
import { GlassCard, CardHeader, CardContent } from '@/components/ui/cards';
import { Button, Badge } from '@/components/ui/button';
import { cn, formatAddress, formatNumber } from '@/lib/utils';
import { useVotingPower, useHasVoted, useCastVote, useQueueProposal, useExecuteProposal } from '@/hooks/useGovernance';
import { useProposal, getDescriptionHash } from '@/hooks/useProposals';

// Vote types
const VoteType = {
  Against: 0,
  For: 1,
  Abstain: 2,
} as const;

// State configuration
const stateConfig: Record<string, { color: string; bgColor: string; icon: any; description: string }> = {
  Pending: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", icon: Clock, description: "Voting has not started yet" },
  Active: { color: "text-blue-400", bgColor: "bg-blue-500/20", icon: Timer, description: "Voting is in progress" },
  Canceled: { color: "text-gray-400", bgColor: "bg-gray-500/20", icon: Ban, description: "Proposal was canceled" },
  Defeated: { color: "text-red-400", bgColor: "bg-red-500/20", icon: XCircle, description: "Proposal did not pass" },
  Succeeded: { color: "text-green-400", bgColor: "bg-green-500/20", icon: CheckCircle, description: "Proposal passed, ready to queue" },
  Queued: { color: "text-purple-400", bgColor: "bg-purple-500/20", icon: Hourglass, description: "Awaiting timelock execution" },
  Expired: { color: "text-orange-400", bgColor: "bg-orange-500/20", icon: Archive, description: "Proposal expired" },
  Executed: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircle, description: "Proposal has been executed" },
};

function ProposalDetailContent() {
  const searchParams = useSearchParams();
  const proposalId = searchParams.get('id');
  
  const { isConnected } = useAccount();
  const { votingPowerFormatted } = useVotingPower();
  const { proposal, isLoading, error } = useProposal(proposalId || undefined);
  const { hasVoted, isLoading: hasVotedLoading } = useHasVoted(proposal?.id);
  const { castVote, isPending: isVoting, isConfirming: isConfirmingVote, isSuccess: voteSuccess, error: voteError, hash: voteHash } = useCastVote();
  const { queue, isPending: isQueueing, isConfirming: isConfirmingQueue, isSuccess: queueSuccess, error: queueError, hash: queueHash } = useQueueProposal();
  const { execute, isPending: isExecuting, isConfirming: isConfirmingExecute, isSuccess: executeSuccess, error: executeError, hash: executeHash } = useExecuteProposal();
  
  const [copied, setCopied] = useState(false);

  const copyProposalId = () => {
    if (proposalId) {
      navigator.clipboard.writeText(proposalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVote = (support: number) => {
    if (proposal?.id) {
      castVote(proposal.id, support);
    }
  };

  const handleQueue = () => {
    if (proposal) {
      const descriptionHash = getDescriptionHash(proposal.description);
      queue(proposal.targets, proposal.values, proposal.calldatas, descriptionHash);
    }
  };

  const handleExecute = () => {
    if (proposal) {
      const descriptionHash = getDescriptionHash(proposal.description);
      execute(proposal.targets, proposal.values, proposal.calldatas, descriptionHash);
    }
  };

  if (!proposalId) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
        <GlassCard>
          <CardContent className="py-20">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-3">No Proposal Selected</h2>
              <p className="text-gray-400 mb-6">
                Please select a proposal from the proposals list.
              </p>
              <Link href="/proposals">
                <Button>View All Proposals</Button>
              </Link>
            </div>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
        <GlassCard>
          <CardContent className="py-20">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-3">Proposal Not Found</h2>
              <p className="text-gray-400 mb-6">
                {error?.message || "The proposal you're looking for doesn't exist."}
              </p>
              <Link href="/proposals">
                <Button>View All Proposals</Button>
              </Link>
            </div>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  const config = stateConfig[proposal.state] || stateConfig.Pending;
  const StateIcon = config.icon;
  const totalVotes = parseFloat(proposal.forVotesFormatted) + parseFloat(proposal.againstVotesFormatted) + parseFloat(proposal.abstainVotesFormatted);
  const forPercent = totalVotes > 0 ? (parseFloat(proposal.forVotesFormatted) / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (parseFloat(proposal.againstVotesFormatted) / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? (parseFloat(proposal.abstainVotesFormatted) / totalVotes) * 100 : 0;
  
  const canVote = proposal.stateNum === 1 && !hasVoted && parseFloat(votingPowerFormatted) > 0;
  const canQueue = proposal.stateNum === 4; // Succeeded
  const canExecute = proposal.stateNum === 5; // Queued

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Link href="/proposals">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={cn(config.bgColor, config.color, "border-0 text-sm")}>
            <StateIcon className="w-4 h-4 mr-1" />
            {proposal.state}
          </Badge>
          <span className="text-sm text-gray-400">
            Created {proposal.createdAt.toLocaleDateString()} at {proposal.createdAt.toLocaleTimeString()}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white">{proposal.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Proposed by {formatAddress(proposal.proposer)}</span>
          <a
            href={`https://sepolia.etherscan.io/address/${proposal.proposer}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-violet-400"
          >
            <ExternalLink className="w-3 h-3" />
            View on Etherscan
          </a>
        </div>
      </motion.div>

      {/* Transaction Status */}
      {(isVoting || isConfirmingVote || voteSuccess || voteError || isQueueing || isConfirmingQueue || queueSuccess || queueError || isExecuting || isConfirmingExecute || executeSuccess || executeError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border",
            (isVoting || isConfirmingVote || isQueueing || isConfirmingQueue || isExecuting || isConfirmingExecute) ? "bg-blue-500/10 border-blue-500/20" :
            (voteSuccess || queueSuccess || executeSuccess) ? "bg-green-500/10 border-green-500/20" :
            "bg-red-500/10 border-red-500/20"
          )}
        >
          <div className="flex items-center gap-3">
            {(isVoting || isConfirmingVote || isQueueing || isConfirmingQueue || isExecuting || isConfirmingExecute) && (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            )}
            {(voteSuccess || queueSuccess || executeSuccess) && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {(voteError || queueError || executeError) && (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className={cn(
                "font-medium",
                (isVoting || isConfirmingVote || isQueueing || isConfirmingQueue || isExecuting || isConfirmingExecute) ? "text-blue-400" :
                (voteSuccess || queueSuccess || executeSuccess) ? "text-green-400" :
                "text-red-400"
              )}>
                {isVoting && "Waiting for wallet confirmation..."}
                {isConfirmingVote && "Vote confirming..."}
                {voteSuccess && "Vote cast successfully!"}
                {voteError && `Vote failed: ${voteError.message}`}
                {isQueueing && "Queueing proposal..."}
                {isConfirmingQueue && "Queue confirming..."}
                {queueSuccess && "Proposal queued!"}
                {queueError && `Queue failed: ${queueError.message}`}
                {isExecuting && "Executing proposal..."}
                {isConfirmingExecute && "Execution confirming..."}
                {executeSuccess && "Proposal executed!"}
                {executeError && `Execution failed: ${executeError.message}`}
              </p>
              {(voteHash || queueHash || executeHash) && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${voteHash || queueHash || executeHash}`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Voting Section */}
          {proposal.stateNum === 1 && (
            <GlassCard>
              <CardHeader
                title="Cast Your Vote"
                description={canVote ? "Choose how you want to vote on this proposal" : ""}
              />
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <p className="text-gray-400">Connect your wallet to vote</p>
                ) : hasVotedLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-400">Checking vote status...</span>
                  </div>
                ) : hasVoted ? (
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-violet-400 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      You have already voted on this proposal
                    </p>
                  </div>
                ) : parseFloat(votingPowerFormatted) === 0 ? (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-400">You need voting power to vote. Delegate to yourself first.</p>
                    <Link href="/delegates" className="text-sm text-violet-400 hover:underline mt-2 inline-block">
                      Go to Delegation →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleVote(VoteType.For)}
                      disabled={isVoting || isConfirmingVote}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        "bg-green-500/10 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/20",
                        (isVoting || isConfirmingVote) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ThumbsUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="font-medium text-green-400">For</p>
                    </button>
                    <button
                      onClick={() => handleVote(VoteType.Against)}
                      disabled={isVoting || isConfirmingVote}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        "bg-red-500/10 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/20",
                        (isVoting || isConfirmingVote) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ThumbsDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <p className="font-medium text-red-400">Against</p>
                    </button>
                    <button
                      onClick={() => handleVote(VoteType.Abstain)}
                      disabled={isVoting || isConfirmingVote}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        "bg-gray-500/10 border-gray-500/30 hover:border-gray-500/50 hover:bg-gray-500/20",
                        (isVoting || isConfirmingVote) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <MinusCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-400">Abstain</p>
                    </button>
                  </div>
                )}
              </CardContent>
            </GlassCard>
          )}

          {/* Queue/Execute Actions */}
          {(canQueue || canExecute) && (
            <GlassCard>
              <CardContent className="p-6">
                {canQueue && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">Proposal Succeeded</h3>
                      <p className="text-sm text-gray-400">Queue this proposal to the timelock for execution</p>
                    </div>
                    <Button onClick={handleQueue} disabled={isQueueing || isConfirmingQueue}>
                      {(isQueueing || isConfirmingQueue) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Queueing...
                        </>
                      ) : (
                        <>
                          <Timer className="w-4 h-4 mr-2" />
                          Queue Proposal
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {canExecute && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">Proposal Queued</h3>
                      <p className="text-sm text-gray-400">Execute this proposal after the timelock delay</p>
                    </div>
                    <Button onClick={handleExecute} disabled={isExecuting || isConfirmingExecute}>
                      {(isExecuting || isConfirmingExecute) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Execute Proposal
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </GlassCard>
          )}

          {/* Description */}
          <GlassCard>
            <CardHeader title="Description" />
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-300">
                  {proposal.description.split('\n').slice(2).join('\n').trim() || proposal.description}
                </div>
              </div>
            </CardContent>
          </GlassCard>

          {/* Proposal Details */}
          <GlassCard>
            <CardHeader title="Proposal Details" />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Proposal ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">
                    {proposalId.slice(0, 10)}...{proposalId.slice(-8)}
                  </span>
                  <button onClick={copyProposalId} className="text-gray-400 hover:text-white">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Targets</span>
                <span className="text-white">{proposal.targets.length} contract(s)</span>
              </div>
              {proposal.targets.map((target, i) => (
                <div key={i} className="pl-4 py-1">
                  <a
                    href={`https://sepolia.etherscan.io/address/${target}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:underline font-mono"
                  >
                    {formatAddress(target)}
                  </a>
                </div>
              ))}
            </CardContent>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vote Results */}
          <GlassCard>
            <CardHeader title="Vote Results" />
            <CardContent className="space-y-4">
              {/* For */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-green-400 font-medium">For</span>
                  <span className="text-white">{formatNumber(parseFloat(proposal.forVotesFormatted))} TUT</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${forPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{forPercent.toFixed(1)}%</p>
              </div>

              {/* Against */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-red-400 font-medium">Against</span>
                  <span className="text-white">{formatNumber(parseFloat(proposal.againstVotesFormatted))} TUT</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${againstPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{againstPercent.toFixed(1)}%</p>
              </div>

              {/* Abstain */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 font-medium">Abstain</span>
                  <span className="text-white">{formatNumber(parseFloat(proposal.abstainVotesFormatted))} TUT</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 rounded-full transition-all"
                    style={{ width: `${abstainPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{abstainPercent.toFixed(1)}%</p>
              </div>

              <div className="pt-4 border-t border-gray-700/50">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Votes</span>
                  <span className="text-white font-semibold">{formatNumber(totalVotes)} TUT</span>
                </div>
              </div>
            </CardContent>
          </GlassCard>

          {/* Status Info */}
          <GlassCard>
            <CardHeader title="Status" />
            <CardContent className="space-y-4">
              <div className={cn(
                "p-4 rounded-xl",
                config.bgColor
              )}>
                <div className="flex items-center gap-3">
                  <StateIcon className={cn("w-6 h-6", config.color)} />
                  <div>
                    <p className={cn("font-semibold", config.color)}>{proposal.state}</p>
                    <p className="text-sm text-gray-400">{config.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Vote Start</span>
                  <span className="text-white">Block #{proposal.voteStart.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vote End</span>
                  <span className="text-white">Block #{proposal.voteEnd.toString()}</span>
                </div>
              </div>
            </CardContent>
          </GlassCard>

          {/* Your Voting Power */}
          {isConnected && (
            <GlassCard>
              <CardHeader title="Your Voting Power" />
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-violet-500/20">
                    <Users className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(parseFloat(votingPowerFormatted))}
                    </p>
                    <p className="text-sm text-gray-400">TUT</p>
                  </div>
                </div>
                {parseFloat(votingPowerFormatted) === 0 && (
                  <Link href="/delegates" className="block mt-4">
                    <Button variant="secondary" size="sm" className="w-full">
                      Delegate to Vote
                    </Button>
                  </Link>
                )}
              </CardContent>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProposalDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ProposalDetailContent />
    </Suspense>
  );
}
