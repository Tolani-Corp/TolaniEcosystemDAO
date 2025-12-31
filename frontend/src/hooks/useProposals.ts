'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient, useReadContract, useAccount } from 'wagmi';
import { useGovernorContract, useTimelockContract } from './useContracts';
import { formatUnits, keccak256, toBytes, encodePacked } from 'viem';
import { sepolia } from 'viem/chains';

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

export interface Proposal {
  id: bigint;
  proposalId: string;
  proposer: string;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  description: string;
  title: string;
  category: string;
  voteStart: bigint;
  voteEnd: bigint;
  state: ProposalStateType;
  stateNum: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  forVotesFormatted: string;
  againstVotesFormatted: string;
  abstainVotesFormatted: string;
  totalVotes: bigint;
  createdAt: Date;
  blockNumber: bigint;
}

// Parse title and category from description
function parseDescription(description: string): { title: string; category: string; body: string } {
  // Description format: "# Title\n\n**Category:** category\n\nbody"
  const lines = description.split('\n');
  let title = 'Untitled Proposal';
  let category = 'General';
  let body = description;

  // Look for title (starts with #)
  const titleLine = lines.find(l => l.startsWith('#'));
  if (titleLine) {
    title = titleLine.replace(/^#+\s*/, '').trim();
  }

  // Look for category
  const categoryLine = lines.find(l => l.includes('**Category:**'));
  if (categoryLine) {
    const match = categoryLine.match(/\*\*Category:\*\*\s*(.+)/);
    if (match) {
      category = match[1].trim();
    }
  }

  // Body is everything after title and category
  const titleIndex = lines.findIndex(l => l.startsWith('#'));
  const categoryIndex = lines.findIndex(l => l.includes('**Category:**'));
  const startIndex = Math.max(titleIndex, categoryIndex) + 1;
  body = lines.slice(startIndex).join('\n').trim();

  return { title, category, body };
}

// Hook to fetch all proposals from events
export function useProposals() {
  const publicClient = usePublicClient();
  const governorContract = useGovernorContract();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!publicClient) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch ProposalCreated events
      // Governor was deployed recently, so we can search from a recent block
      // For production, you'd want to track this or use a subgraph
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(50000); // ~7 days on Sepolia

      const logs = await publicClient.getLogs({
        address: governorContract.address,
        event: {
          type: 'event',
          name: 'ProposalCreated',
          inputs: [
            { type: 'uint256', name: 'proposalId', indexed: false },
            { type: 'address', name: 'proposer', indexed: false },
            { type: 'address[]', name: 'targets', indexed: false },
            { type: 'uint256[]', name: 'values', indexed: false },
            { type: 'string[]', name: 'signatures', indexed: false },
            { type: 'bytes[]', name: 'calldatas', indexed: false },
            { type: 'uint256', name: 'voteStart', indexed: false },
            { type: 'uint256', name: 'voteEnd', indexed: false },
            { type: 'string', name: 'description', indexed: false },
          ],
        },
        fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
        toBlock: 'latest',
      });

      // Process each proposal
      const proposalPromises = logs.map(async (log) => {
        const args = log.args as {
          proposalId: bigint;
          proposer: string;
          targets: string[];
          values: bigint[];
          signatures: string[];
          calldatas: string[];
          voteStart: bigint;
          voteEnd: bigint;
          description: string;
        };

        // Get proposal state
        const state = await publicClient.readContract({
          address: governorContract.address,
          abi: governorContract.abi,
          functionName: 'state',
          args: [args.proposalId],
        }) as number;

        // Get proposal votes
        const votes = await publicClient.readContract({
          address: governorContract.address,
          abi: governorContract.abi,
          functionName: 'proposalVotes',
          args: [args.proposalId],
        }) as [bigint, bigint, bigint];

        const [againstVotes, forVotes, abstainVotes] = votes;

        // Get block timestamp
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

        // Parse description
        const { title, category, body } = parseDescription(args.description);

        return {
          id: args.proposalId,
          proposalId: args.proposalId.toString(),
          proposer: args.proposer,
          targets: args.targets as string[],
          values: args.values.map(v => BigInt(v)),
          calldatas: args.calldatas as string[],
          description: args.description,
          title,
          category,
          voteStart: args.voteStart,
          voteEnd: args.voteEnd,
          state: ProposalState[state as keyof typeof ProposalState],
          stateNum: state,
          forVotes,
          againstVotes,
          abstainVotes,
          forVotesFormatted: formatUnits(forVotes, 18),
          againstVotesFormatted: formatUnits(againstVotes, 18),
          abstainVotesFormatted: formatUnits(abstainVotes, 18),
          totalVotes: forVotes + againstVotes + abstainVotes,
          createdAt: new Date(Number(block.timestamp) * 1000),
          blockNumber: log.blockNumber,
        } as Proposal;
      });

      const fetchedProposals = await Promise.all(proposalPromises);
      
      // Sort by creation time (newest first)
      fetchedProposals.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      
      setProposals(fetchedProposals);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, governorContract]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    isLoading,
    error,
    refetch: fetchProposals,
  };
}

// Hook to fetch a single proposal by ID
export function useProposal(proposalId: string | undefined) {
  const publicClient = usePublicClient();
  const governorContract = useGovernorContract();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publicClient || !proposalId) {
      setIsLoading(false);
      return;
    }

    const fetchProposal = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const id = BigInt(proposalId);

        // Get proposal state
        const state = await publicClient.readContract({
          address: governorContract.address,
          abi: governorContract.abi,
          functionName: 'state',
          args: [id],
        }) as number;

        // Get proposal votes
        const votes = await publicClient.readContract({
          address: governorContract.address,
          abi: governorContract.abi,
          functionName: 'proposalVotes',
          args: [id],
        }) as [bigint, bigint, bigint];

        const [againstVotes, forVotes, abstainVotes] = votes;

        // Search for the proposal event
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(50000);

        const logs = await publicClient.getLogs({
          address: governorContract.address,
          event: {
            type: 'event',
            name: 'ProposalCreated',
            inputs: [
              { type: 'uint256', name: 'proposalId', indexed: false },
              { type: 'address', name: 'proposer', indexed: false },
              { type: 'address[]', name: 'targets', indexed: false },
              { type: 'uint256[]', name: 'values', indexed: false },
              { type: 'string[]', name: 'signatures', indexed: false },
              { type: 'bytes[]', name: 'calldatas', indexed: false },
              { type: 'uint256', name: 'voteStart', indexed: false },
              { type: 'uint256', name: 'voteEnd', indexed: false },
              { type: 'string', name: 'description', indexed: false },
            ],
          },
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: 'latest',
        });

        // Find the matching proposal
        const log = logs.find(l => {
          const args = l.args as { proposalId: bigint };
          return args.proposalId === id;
        });

        if (!log) {
          throw new Error('Proposal not found');
        }

        const args = log.args as {
          proposalId: bigint;
          proposer: string;
          targets: string[];
          values: bigint[];
          signatures: string[];
          calldatas: string[];
          voteStart: bigint;
          voteEnd: bigint;
          description: string;
        };

        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        const { title, category } = parseDescription(args.description);

        setProposal({
          id: args.proposalId,
          proposalId: args.proposalId.toString(),
          proposer: args.proposer,
          targets: args.targets as string[],
          values: args.values.map(v => BigInt(v)),
          calldatas: args.calldatas as string[],
          description: args.description,
          title,
          category,
          voteStart: args.voteStart,
          voteEnd: args.voteEnd,
          state: ProposalState[state as keyof typeof ProposalState],
          stateNum: state,
          forVotes,
          againstVotes,
          abstainVotes,
          forVotesFormatted: formatUnits(forVotes, 18),
          againstVotesFormatted: formatUnits(againstVotes, 18),
          abstainVotesFormatted: formatUnits(abstainVotes, 18),
          totalVotes: forVotes + againstVotes + abstainVotes,
          createdAt: new Date(Number(block.timestamp) * 1000),
          blockNumber: log.blockNumber,
        });
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [publicClient, proposalId, governorContract]);

  return {
    proposal,
    isLoading,
    error,
  };
}

// Hook for active proposals only
export function useActiveProposals() {
  const { proposals, isLoading, error, refetch } = useProposals();

  const activeProposals = useMemo(() => {
    return proposals.filter(p => p.stateNum === 1); // Active state
  }, [proposals]);

  return {
    proposals: activeProposals,
    isLoading,
    error,
    refetch,
  };
}

// Hook for pending proposals (can be queued)
export function useSucceededProposals() {
  const { proposals, isLoading, error, refetch } = useProposals();

  const succeededProposals = useMemo(() => {
    return proposals.filter(p => p.stateNum === 4); // Succeeded state
  }, [proposals]);

  return {
    proposals: succeededProposals,
    isLoading,
    error,
    refetch,
  };
}

// Hook for queued proposals (can be executed)
export function useQueuedProposals() {
  const { proposals, isLoading, error, refetch } = useProposals();

  const queuedProposals = useMemo(() => {
    return proposals.filter(p => p.stateNum === 5); // Queued state
  }, [proposals]);

  return {
    proposals: queuedProposals,
    isLoading,
    error,
    refetch,
  };
}

// Get description hash for queue/execute
export function getDescriptionHash(description: string): `0x${string}` {
  return keccak256(toBytes(description));
}
