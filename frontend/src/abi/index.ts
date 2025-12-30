// Contract ABIs for TolaniDAO
// For multi-network support, use @/config/contracts and @/hooks/useContracts

import GovernorABI from './Governor.json';
import TimelockABI from './Timelock.json';
import TreasuryABI from './Treasury.json';
import TokenABI from './Token.json';

// Export raw ABIs
export { GovernorABI, TimelockABI, TreasuryABI, TokenABI };

// Re-export from config for convenience
export {
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
  DEFAULT_CHAIN_ID,
  ABIS,
  getContractConfig,
  isSupportedChain,
  getChainName,
} from '@/config/contracts';

// Re-export hooks
export {
  useContracts,
  useGovernorContract,
  useTimelockContract,
  useTreasuryContract,
  useTokenContract,
  useIsSupportedChain,
} from '@/hooks/useContracts';

// Legacy exports for backward compatibility (uses Sepolia addresses)
// Prefer using useContracts() hook for multi-network support
import { CONTRACT_ADDRESSES, CHAIN_IDS } from '@/config/contracts';

const SEPOLIA_ADDRESSES = CONTRACT_ADDRESSES[CHAIN_IDS.SEPOLIA];

export const CONTRACTS = {
  governor: {
    address: SEPOLIA_ADDRESSES.governor,
    abi: GovernorABI.abi,
  },
  timelock: {
    address: SEPOLIA_ADDRESSES.timelock,
    abi: TimelockABI.abi,
  },
  treasury: {
    address: SEPOLIA_ADDRESSES.treasury,
    abi: TreasuryABI.abi,
  },
  token: {
    address: SEPOLIA_ADDRESSES.token,
    abi: TokenABI.abi,
  },
} as const;

export const governorConfig = CONTRACTS.governor;
export const timelockConfig = CONTRACTS.timelock;
export const treasuryConfig = CONTRACTS.treasury;
export const tokenConfig = CONTRACTS.token;
