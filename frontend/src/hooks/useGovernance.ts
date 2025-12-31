'use client';

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useGovernorContract, useTokenContract, useTimelockContract } from './useContracts';
import { useState, useEffect, useMemo } from 'react';
import { formatUnits, parseUnits, keccak256, toHex, encodePacked } from 'viem';

// Proposal state enum (matches Governor.sol)
export const ProposalState = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed',
} as const;

export type ProposalStateType = (typeof ProposalState)[keyof typeof ProposalState];

// Vote type enum
export const VoteType = {
  Against: 0,
  For: 1,
  Abstain: 2,
} as const;

export interface OnChainProposal {
  id: bigint;
  proposer: string;
  state: ProposalStateType;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  description: string;
  targets: string[];
  values: bigint[];
  calldatas: string[];
}

// Hook to get user's voting power
export function useVotingPower() {
  const { address } = useAccount();
  const tokenContract = useTokenContract();

  const { data: votingPower, isLoading, refetch } = useReadContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    votingPower: votingPower ? BigInt(votingPower as string) : BigInt(0),
    votingPowerFormatted: votingPower ? formatUnits(BigInt(votingPower as string), 18) : '0',
    isLoading,
    refetch,
  };
}

// Hook to get user's token balance
export function useTokenBalance() {
  const { address } = useAccount();
  const tokenContract = useTokenContract();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: balance ? BigInt(balance as string) : BigInt(0),
    balanceFormatted: balance ? formatUnits(BigInt(balance as string), 18) : '0',
    isLoading,
    refetch,
  };
}

// Hook to get delegate address
export function useDelegate() {
  const { address } = useAccount();
  const tokenContract = useTokenContract();

  const { data: delegate, isLoading, refetch } = useReadContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    delegate: delegate as string | undefined,
    hasDelegated: delegate && delegate !== '0x0000000000000000000000000000000000000000',
    isSelfDelegated: delegate === address,
    isLoading,
    refetch,
  };
}

// Hook to delegate votes
export function useDelegateVotes() {
  const tokenContract = useTokenContract();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const delegate = (delegatee: string) => {
    writeContract({
      address: tokenContract.address,
      abi: tokenContract.abi,
      functionName: 'delegate',
      args: [delegatee],
    });
  };

  return {
    delegate,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to get governor parameters
export function useGovernorParams() {
  const governorContract = useGovernorContract();

  const { data: proposalThreshold } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'proposalThreshold',
  });

  const { data: quorumNumerator } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'quorumNumerator',
  });

  const { data: votingDelay } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'votingDelay',
  });

  const { data: votingPeriod } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'votingPeriod',
  });

  return {
    proposalThreshold: proposalThreshold ? BigInt(proposalThreshold as string) : BigInt(0),
    proposalThresholdFormatted: proposalThreshold 
      ? formatUnits(BigInt(proposalThreshold as string), 18) 
      : '0',
    quorumNumerator: quorumNumerator ? Number(quorumNumerator) : 0,
    votingDelay: votingDelay ? Number(votingDelay) : 0,
    votingPeriod: votingPeriod ? Number(votingPeriod) : 0,
  };
}

// Hook to get proposal state
export function useProposalState(proposalId: bigint | undefined) {
  const governorContract = useGovernorContract();

  const { data: state, isLoading, refetch } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'state',
    args: proposalId ? [proposalId] : undefined,
    query: {
      enabled: !!proposalId,
    },
  });

  return {
    state: state !== undefined ? ProposalState[state as keyof typeof ProposalState] : undefined,
    stateNum: state as number | undefined,
    isLoading,
    refetch,
  };
}

// Hook to get proposal votes
export function useProposalVotes(proposalId: bigint | undefined) {
  const governorContract = useGovernorContract();

  const { data: votes, isLoading, refetch } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'proposalVotes',
    args: proposalId ? [proposalId] : undefined,
    query: {
      enabled: !!proposalId,
    },
  });

  const [againstVotes, forVotes, abstainVotes] = (votes as [bigint, bigint, bigint]) || [BigInt(0), BigInt(0), BigInt(0)];

  return {
    forVotes,
    againstVotes,
    abstainVotes,
    totalVotes: forVotes + againstVotes + abstainVotes,
    forVotesFormatted: formatUnits(forVotes || BigInt(0), 18),
    againstVotesFormatted: formatUnits(againstVotes || BigInt(0), 18),
    abstainVotesFormatted: formatUnits(abstainVotes || BigInt(0), 18),
    isLoading,
    refetch,
  };
}

// Hook to check if user has voted
export function useHasVoted(proposalId: bigint | undefined) {
  const { address } = useAccount();
  const governorContract = useGovernorContract();

  const { data: hasVoted, isLoading, refetch } = useReadContract({
    address: governorContract.address,
    abi: governorContract.abi,
    functionName: 'hasVoted',
    args: proposalId && address ? [proposalId, address] : undefined,
    query: {
      enabled: !!proposalId && !!address,
    },
  });

  return {
    hasVoted: hasVoted as boolean | undefined,
    isLoading,
    refetch,
  };
}

// Hook to cast vote
export function useCastVote() {
  const governorContract = useGovernorContract();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const castVote = (proposalId: bigint, support: number) => {
    writeContract({
      address: governorContract.address,
      abi: governorContract.abi,
      functionName: 'castVote',
      args: [proposalId, support],
    });
  };

  const castVoteWithReason = (proposalId: bigint, support: number, reason: string) => {
    writeContract({
      address: governorContract.address,
      abi: governorContract.abi,
      functionName: 'castVoteWithReason',
      args: [proposalId, support, reason],
    });
  };

  return {
    castVote,
    castVoteWithReason,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to create proposal
export function useCreateProposal() {
  const governorContract = useGovernorContract();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const propose = (
    targets: string[],
    values: bigint[],
    calldatas: string[],
    description: string
  ) => {
    writeContract({
      address: governorContract.address,
      abi: governorContract.abi,
      functionName: 'propose',
      args: [targets, values, calldatas, description],
    });
  };

  return {
    propose,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to queue proposal
export function useQueueProposal() {
  const governorContract = useGovernorContract();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const queue = (
    targets: string[],
    values: bigint[],
    calldatas: string[],
    descriptionHash: string
  ) => {
    writeContract({
      address: governorContract.address,
      abi: governorContract.abi,
      functionName: 'queue',
      args: [targets, values, calldatas, descriptionHash],
    });
  };

  return {
    queue,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to execute proposal
export function useExecuteProposal() {
  const governorContract = useGovernorContract();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const execute = (
    targets: string[],
    values: bigint[],
    calldatas: string[],
    descriptionHash: string
  ) => {
    writeContract({
      address: governorContract.address,
      abi: governorContract.abi,
      functionName: 'execute',
      args: [targets, values, calldatas, descriptionHash],
    });
  };

  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to get proposal count (approximation via events - for UI stats)
export function useProposalCount() {
  const governorContract = useGovernorContract();
  
  // OpenZeppelin Governor doesn't have a proposalCount getter
  // We'd need to index events for accurate counts
  // For now, return a placeholder
  return {
    count: 0,
    isLoading: false,
  };
}

// Hook to get total supply for quorum calculation
export function useTokenTotalSupply() {
  const tokenContract = useTokenContract();

  const { data: totalSupply, isLoading } = useReadContract({
    address: tokenContract.address,
    abi: tokenContract.abi,
    functionName: 'totalSupply',
  });

  return {
    totalSupply: totalSupply ? BigInt(totalSupply as string) : BigInt(0),
    totalSupplyFormatted: totalSupply ? formatUnits(BigInt(totalSupply as string), 18) : '0',
    isLoading,
  };
}

// Calculate quorum needed
export function useQuorum() {
  const { quorumNumerator } = useGovernorParams();
  const { totalSupply } = useTokenTotalSupply();

  const quorum = useMemo(() => {
    if (!totalSupply || !quorumNumerator) return BigInt(0);
    return (totalSupply * BigInt(quorumNumerator)) / BigInt(100);
  }, [totalSupply, quorumNumerator]);

  return {
    quorum,
    quorumFormatted: formatUnits(quorum, 18),
  };
}
