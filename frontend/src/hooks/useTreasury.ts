'use client';

import { useReadContract, useReadContracts, useAccount, useBalance } from 'wagmi';
import { useTreasuryContract, useTokenContract, useContracts } from './useContracts';
import { formatUnits, formatEther } from 'viem';
import { useMemo } from 'react';

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

// Hook to calculate total ecosystem value across all contracts
export function useEcosystemValue() {
  const treasury = useTreasuryStats();
  const escrow = useEscrowBalance();
  const payroll = usePayrollBalance();

  const totalTokens = useMemo(() => {
    return treasury.tokenBalance + escrow.tokenBalance + payroll.tokenBalance;
  }, [treasury.tokenBalance, escrow.tokenBalance, payroll.tokenBalance]);

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
    isLoading: treasury.isLoading || escrow.isLoading || payroll.isLoading,
  };
}
