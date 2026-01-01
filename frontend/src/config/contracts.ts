import GovernorABI from '@/abi/Governor.json';
import TimelockABI from '@/abi/Timelock.json';
import TreasuryABI from '@/abi/Treasury.json';
import TokenABI from '@/abi/Token.json';
import EscrowABI from '@/abi/Escrow.json';
import PayrollABI from '@/abi/Payroll.json';
import ComplianceABI from '@/abi/Compliance.json';
import ESGABI from '@/abi/ESG.json';
// Allocation contracts
import TokenAllocatorABI from '@/abi/TokenAllocator.json';
import TrainingRewardsABI from '@/abi/TrainingRewards.json';
import VestingManagerABI from '@/abi/VestingManager.json';
import TaskBountiesABI from '@/abi/TaskBounties.json';
// DeFi contracts
import StakingPoolABI from '@/abi/StakingPool.json';
import LiquidityManagerABI from '@/abi/LiquidityManager.json';
import LiquidityIncentivesABI from '@/abi/LiquidityIncentives.json';
// IBM SkillsBuild Training contracts
import uTUTABI from '@/abi/uTUT.json';
import TrainingRewardsV2ABI from '@/abi/TrainingRewardsV2.json';
import SessionKeyRegistryABI from '@/abi/SessionKeyRegistry.json';

// Chain IDs
export const CHAIN_IDS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARBITRUM: 42161,
  BASE_SEPOLIA: 84532, // Base Sepolia L2 Testnet
  BASE: 8453, // Base Mainnet
} as const;

// Contract addresses by network
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet (update after mainnet deployment)
  [CHAIN_IDS.MAINNET]: {
    governor: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    timelock: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    escrow: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    payroll: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    compliance: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    esg: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Sepolia Testnet (NEW deployment - Dec 30, 2025)
  // Using upgraded TUT token with ERC20Votes governance
  [CHAIN_IDS.SEPOLIA]: {
    governor: '0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f' as `0x${string}`,
    timelock: '0x9d0ccD1371B3a1f570B353c46840C268Aac57872' as `0x${string}`,
    treasury: '0xBB9d207ee665e9680458F2E451098f23D707Ad25' as `0x${string}`,
    token: '0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6' as `0x${string}`, // Upgraded TUT with ERC20Votes
    escrow: '0x8be1b90e8E6A7025814Cf249031795D7fa89faFd' as `0x${string}`,
    payroll: '0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC' as `0x${string}`,
    compliance: '0xE253d4EeA0AB79d04a9ABca1257C7F2167886298' as `0x${string}`,
    esg: '0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867' as `0x${string}`,
    // Allocation contracts (Dec 30, 2025 - Updated Jan 2025 with Tolani Foundation)
    tokenAllocator: '0x2b3B2a6036099B144b0C5fB95a26b775785B3360' as `0x${string}`,
    trainingRewards: '0x27D6Dd0797a3F4e5fa90A0214B06AEF4528a0596' as `0x${string}`,
    vestingManager: '0x4185218AC05736bd5903A4E4A6765B24EabF4c62' as `0x${string}`,
    taskBounties: '0x19ba97DFF787916bA064E33000225b4e725e50fB' as `0x${string}`,
    // DeFi contracts (Dec 30, 2025)
    stakingPool: '0x50E0660068d2D3411885BD533a5943189b7AdF70' as `0x${string}`,
    liquidityManager: '0xbAFAD13BAAF482bBE58D3949ABd05dAD64C051cB' as `0x${string}`,
    liquidityIncentives: '0x09cCCc3D8F9D1269Fd6bd8C83fE448de37D46031' as `0x${string}`,
    // IBM SkillsBuild Training Contracts (Dec 31, 2025)
    uTUT: '0xc9D0D68aC9A4678Fb58CB7AE5c4c6b0B7cf60E38' as `0x${string}`,
    tutConverter: '0x82D131Fbf9aC7629499cC05DA21b7dD317e5748D' as `0x${string}`,
    sessionKeyRegistry: '0xF9e6A163852D7B73B8F5A13cAbAe529C5b4c4c27' as `0x${string}`,
    gasTreasuryModule: '0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd' as `0x${string}`,
    trainingRewardsV2: '0x6C5892afBdf60123edd408404347E59F72D4Eb4c' as `0x${string}`,
    sessionInvoker: '0x46Fc54f90023098655b237E3543609BF8dCB938e' as `0x${string}`,
  },
  // Base Sepolia L2 Testnet - IBM SkillsBuild Training (Jan 2025)
  // Low-cost L2 for training rewards with meta-transactions
  [CHAIN_IDS.BASE_SEPOLIA]: {
    // Core Training Contracts
    uTUT: '0xf4758a12583F424B65CC860A2ff3D3B501cf591C' as `0x${string}`,
    sessionKeyRegistry: '0xD360F7c69c18dA78461BE5364cBC56C14b584607' as `0x${string}`,
    gasTreasuryModule: '0xC12035B044c5988E9977E50bA0913AEF4eec28F7' as `0x${string}`,
    trainingRewardsV2: '0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC' as `0x${string}`,
    sessionInvoker: '0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867' as `0x${string}`,
    // TUT Bridge / Converter
    mockBridgedTUT: '0x05AbCD77f178cF43E561091f263Eaa66353Dce87' as `0x${string}`,
    tutConverter: '0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2' as `0x${string}`,
    // Placeholder addresses for L1 contracts (not deployed on L2)
    governor: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    timelock: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    escrow: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    payroll: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    compliance: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    esg: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    trainingRewards: '0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC' as `0x${string}`, // Alias for trainingRewardsV2
  },
} as const;

// Default chain (change to MAINNET for production)
export const DEFAULT_CHAIN_ID = CHAIN_IDS.SEPOLIA;

// Supported chains for the DAO
// NOTE: Mainnet disabled until contracts are deployed
// Add CHAIN_IDS.MAINNET to this array after mainnet deployment
export const SUPPORTED_CHAIN_IDS = [CHAIN_IDS.SEPOLIA, CHAIN_IDS.BASE_SEPOLIA] as const;

// ABIs (same across all networks)
export const ABIS = {
  governor: GovernorABI.abi,
  timelock: TimelockABI.abi,
  treasury: TreasuryABI.abi,
  token: TokenABI.abi,
  escrow: EscrowABI.abi,
  payroll: PayrollABI.abi,
  compliance: ComplianceABI.abi,
  esg: ESGABI.abi,
  // Allocation
  tokenAllocator: TokenAllocatorABI.abi,
  trainingRewards: TrainingRewardsABI.abi,
  vestingManager: VestingManagerABI.abi,
  taskBounties: TaskBountiesABI.abi,
  // DeFi
  stakingPool: StakingPoolABI.abi,
  liquidityManager: LiquidityManagerABI.abi,
  liquidityIncentives: LiquidityIncentivesABI.abi,
  // IBM SkillsBuild Training
  uTUT: uTUTABI.abi,
  trainingRewardsV2: TrainingRewardsV2ABI.abi,
  sessionKeyRegistry: SessionKeyRegistryABI.abi,
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
    escrow: {
      address: addresses.escrow,
      abi: ABIS.escrow,
    },
    payroll: {
      address: addresses.payroll,
      abi: ABIS.payroll,
    },
    compliance: {
      address: addresses.compliance,
      abi: ABIS.compliance,
    },
    esg: {
      address: addresses.esg,
      abi: ABIS.esg,
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
    case CHAIN_IDS.BASE_SEPOLIA:
      return 'Base Sepolia';
    case CHAIN_IDS.BASE:
      return 'Base';
    default:
      return 'Unknown Network';
  }
}

// Check if mainnet is configured
export function isMainnetConfigured(): boolean {
  const mainnetAddresses = CONTRACT_ADDRESSES[CHAIN_IDS.MAINNET];
  return mainnetAddresses.governor !== '0x0000000000000000000000000000000000000000';
}
