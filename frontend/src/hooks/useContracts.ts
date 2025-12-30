'use client';

import { useChainId } from 'wagmi';
import { useMemo } from 'react';
import {
  getContractConfig,
  isSupportedChain,
  DEFAULT_CHAIN_ID,
  ABIS,
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
} from '@/config/contracts';

// Hook to get current chain's contract addresses
export function useContracts() {
  const chainId = useChainId();

  return useMemo(() => {
    const effectiveChainId = isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID;
    return getContractConfig(effectiveChainId);
  }, [chainId]);
}

// Hook to get governor contract config
export function useGovernorContract() {
  const contracts = useContracts();
  return contracts.governor;
}

// Hook to get timelock contract config
export function useTimelockContract() {
  const contracts = useContracts();
  return contracts.timelock;
}

// Hook to get treasury contract config
export function useTreasuryContract() {
  const contracts = useContracts();
  return contracts.treasury;
}

// Hook to get token contract config
export function useTokenContract() {
  const contracts = useContracts();
  return contracts.token;
}

// Hook to check if current chain is supported
export function useIsSupportedChain() {
  const chainId = useChainId();
  return isSupportedChain(chainId);
}

// Hook to get effective chain ID (falls back to default if unsupported)
export function useEffectiveChainId() {
  const chainId = useChainId();
  return isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID;
}

// Export for convenience
export { ABIS, CONTRACT_ADDRESSES, CHAIN_IDS, DEFAULT_CHAIN_ID };
