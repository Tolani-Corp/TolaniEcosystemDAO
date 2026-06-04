'use client';

import { useReadContract, useBalance, useChainId } from 'wagmi';
import { useContracts } from './useContracts';
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN_ID, isSupportedChain } from '@/config/contracts';
import { formatUnits, formatEther } from 'viem';
import { useMemo } from 'react';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

function useConfiguredAddress(key: string) {
  const chainId = useChainId();
  const effectiveChainId = isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const addresses = CONTRACT_ADDRESSES[effectiveChainId] as Record<string, `0x${string}` | undefined>;

  return addresses[key] || ZERO_ADDRESS;
}

// Hook to get treasury ETH balance
export function useTreasuryEthBalance() {
  const contracts = useContracts();
  
  const { data: balance, isLoading, refetch } = useBalance({
    address: contracts.treasury.address,
  });

  return {
    balance: balance?.value || BigInt(0),
    balanceFormatted: balance ? formatEther(balance.value) : '0',
    symbol: balance?.symbol || 'ETH',
    isLoading,
    refetch,
  };
}

// Hook to get treasury TUT token balance
export function useTreasuryTokenBalance() {
  const contracts = useContracts();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: contracts.token.address,
    abi: contracts.token.abi,
    functionName: 'balanceOf',
    args: [contracts.treasury.address],
  });

  return {
    balance: balance ? BigInt(balance as string) : BigInt(0),
    balanceFormatted: balance ? formatUnits(BigInt(balance as string), 18) : '0',
    isLoading,
    refetch,
  };
}

// Combined treasury stats
export function useTreasuryStats() {
  const ethBalance = useTreasuryEthBalance();
  const tokenBalance = useTreasuryTokenBalance();

  return {
    ethBalance: ethBalance.balance,
    ethBalanceFormatted: ethBalance.balanceFormatted,
    tokenBalance: tokenBalance.balance,
    tokenBalanceFormatted: tokenBalance.balanceFormatted,
    isLoading: ethBalance.isLoading || tokenBalance.isLoading,
    refetch: () => {
      ethBalance.refetch();
      tokenBalance.refetch();
    },
  };
}

// Hook to get escrow contract balance
export function useEscrowBalance() {
  const contracts = useContracts();

  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address: contracts.escrow.address,
  });

  const { data: tokenBalance, isLoading: tokenLoading } = useReadContract({
    address: contracts.token.address,
    abi: contracts.token.abi,
    functionName: 'balanceOf',
    args: [contracts.escrow.address],
  });

  return {
    ethBalance: ethBalance?.value || BigInt(0),
    ethBalanceFormatted: ethBalance ? formatEther(ethBalance.value) : '0',
    tokenBalance: tokenBalance ? BigInt(tokenBalance as string) : BigInt(0),
    tokenBalanceFormatted: tokenBalance ? formatUnits(BigInt(tokenBalance as string), 18) : '0',
    isLoading: ethLoading || tokenLoading,
  };
}

// Hook to get payroll contract balance (for payroll fund)
export function usePayrollBalance() {
  const contracts = useContracts();

  const { data: tokenBalance, isLoading } = useReadContract({
    address: contracts.token.address,
    abi: contracts.token.abi,
    functionName: 'balanceOf',
    args: [contracts.payroll.address],
  });

  return {
    tokenBalance: tokenBalance ? BigInt(tokenBalance as string) : BigInt(0),
    tokenBalanceFormatted: tokenBalance ? formatUnits(BigInt(tokenBalance as string), 18) : '0',
    isLoading,
  };
}

// Hook to get TUT held in the TUTConverter reserve
export function useConverterReserveBalance() {
  const contracts = useContracts();
  const converterAddress = useConfiguredAddress('tutConverter');

  const { data: tokenBalance, isLoading, refetch } = useReadContract({
    address: contracts.token.address,
    abi: contracts.token.abi,
    functionName: 'balanceOf',
    args: [converterAddress],
  });

  return {
    address: converterAddress,
    tokenBalance: tokenBalance ? BigInt(tokenBalance as string) : BigInt(0),
    tokenBalanceFormatted: tokenBalance ? formatUnits(BigInt(tokenBalance as string), 18) : '0',
    isLoading,
    refetch,
  };
}

// Hook to get TUT held in the clean staking pool
export function useStakingPoolBalance() {
  const contracts = useContracts();
  const stakingPoolAddress = useConfiguredAddress('stakingPool');

  const { data: tokenBalance, isLoading, refetch } = useReadContract({
    address: contracts.token.address,
    abi: contracts.token.abi,
    functionName: 'balanceOf',
    args: [stakingPoolAddress],
  });

  return {
    address: stakingPoolAddress,
    tokenBalance: tokenBalance ? BigInt(tokenBalance as string) : BigInt(0),
    tokenBalanceFormatted: tokenBalance ? formatUnits(BigInt(tokenBalance as string), 18) : '0',
    isLoading,
    refetch,
  };
}

// Hook to calculate total ecosystem value across all contracts
export function useEcosystemValue() {
  const treasury = useTreasuryStats();
  const escrow = useEscrowBalance();
  const payroll = usePayrollBalance();
  const converterReserve = useConverterReserveBalance();
  const stakingPool = useStakingPoolBalance();

  const totalTokens = useMemo(() => {
    return treasury.tokenBalance + escrow.tokenBalance + payroll.tokenBalance + converterReserve.tokenBalance + stakingPool.tokenBalance;
  }, [
    treasury.tokenBalance,
    escrow.tokenBalance,
    payroll.tokenBalance,
    converterReserve.tokenBalance,
    stakingPool.tokenBalance,
  ]);

  const totalEth = useMemo(() => {
    return treasury.ethBalance + escrow.ethBalance;
  }, [treasury.ethBalance, escrow.ethBalance]);

  return {
    totalTokens,
    totalTokensFormatted: formatUnits(totalTokens, 18),
    totalEth,
    totalEthFormatted: formatEther(totalEth),
    treasury,
    escrow,
    payroll,
    converterReserve,
    stakingPool,
    isLoading: treasury.isLoading || escrow.isLoading || payroll.isLoading || converterReserve.isLoading || stakingPool.isLoading,
  };
}
