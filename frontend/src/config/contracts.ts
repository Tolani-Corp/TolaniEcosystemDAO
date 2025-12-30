import GovernorABI from '@/abi/Governor.json';
import TimelockABI from '@/abi/Timelock.json';
import TreasuryABI from '@/abi/Treasury.json';
import TokenABI from '@/abi/Token.json';

// Chain IDs
export const CHAIN_IDS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
} as const;

// Contract addresses by network
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet (update after mainnet deployment)
  [CHAIN_IDS.MAINNET]: {
    governor: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    timelock: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Sepolia Testnet (current deployment - Dec 29, 2025)
  [CHAIN_IDS.SEPOLIA]: {
    governor: '0x4bfc55437d2006B0f3615dA96Dad41051006f32D' as `0x${string}`,
    timelock: '0x707b6e5513aB897CE30A8791b81Cb1eF4D2bE8d4' as `0x${string}`,
    treasury: '0xBA83421da27c435f5F8eB8E6f5cFFe555aF3d669' as `0x${string}`,
    token: '0x6D07D1dC1750B9d939e1b503d7fa6Faa803e2eFb' as `0x${string}`,
  },
} as const;

// Default chain (change to MAINNET for production)
export const DEFAULT_CHAIN_ID = CHAIN_IDS.SEPOLIA;

// Supported chains for the DAO
export const SUPPORTED_CHAIN_IDS = [CHAIN_IDS.SEPOLIA, CHAIN_IDS.MAINNET] as const;

// ABIs (same across all networks)
export const ABIS = {
  governor: GovernorABI.abi,
  timelock: TimelockABI.abi,
  treasury: TreasuryABI.abi,
  token: TokenABI.abi,
} as const;

// Helper to get contract config for a specific chain
export function getContractConfig(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  
  if (!addresses) {
    console.warn(`Chain ${chainId} not supported, falling back to default`);
    return getContractConfig(DEFAULT_CHAIN_ID);
  }

  return {
    governor: {
      address: addresses.governor,
      abi: ABIS.governor,
    },
    timelock: {
      address: addresses.timelock,
      abi: ABIS.timelock,
    },
    treasury: {
      address: addresses.treasury,
      abi: ABIS.treasury,
    },
    token: {
      address: addresses.token,
      abi: ABIS.token,
    },
  };
}

// Check if a chain is supported
export function isSupportedChain(chainId: number): boolean {
  return chainId in CONTRACT_ADDRESSES;
}

// Get chain name
export function getChainName(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.MAINNET:
      return 'Ethereum Mainnet';
    case CHAIN_IDS.SEPOLIA:
      return 'Sepolia Testnet';
    case CHAIN_IDS.POLYGON:
      return 'Polygon';
    case CHAIN_IDS.ARBITRUM:
      return 'Arbitrum One';
    default:
      return 'Unknown Network';
  }
}

// Check if mainnet is configured
export function isMainnetConfigured(): boolean {
  const mainnetAddresses = CONTRACT_ADDRESSES[CHAIN_IDS.MAINNET];
  return mainnetAddresses.governor !== '0x0000000000000000000000000000000000000000';
}
