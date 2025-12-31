/**
 * TUT Tokenomics Configuration
 * Tolani Ecosystem DAO - Bootstrap Phase
 * 
 * Created: December 31, 2025
 * Target Staking Launch: Late 2026
 * 
 * IMPORTANT: This is a utility token with NO investment promises.
 * All allocations support ecosystem operations, not profit distribution.
 */

const { ethers } = require("hardhat");

// ============================================================
// CORE TOKEN PARAMETERS
// ============================================================

const TOKEN_CONFIG = {
  name: "Tolani Utility Token",
  symbol: "TUT",
  decimals: 18,
  
  // Supply Configuration (100M cap)
  initialSupply: ethers.parseEther("50000000"),  // 50M TUT
  maxCap: ethers.parseEther("100000000"),        // 100M TUT
  
  // Phase definitions
  phases: {
    BOOTSTRAP: "2025-2026",  // Current
    GROWTH: "2026-2028",
    MATURITY: "2028+",
  },
};

// ============================================================
// LIQUIDITY CONFIGURATION
// Target: Late 2026 (when capital raised)
// ============================================================

const LIQUIDITY_CONFIG = {
  // Initial liquidity parameters
  targetUSD: 25000,  // $20K - $30K range, using $25K as baseline
  tutAllocation: ethers.parseEther("2000000"),  // 2M TUT for liquidity
  
  // Calculated values (adjust ETH price as needed)
  ethPrice: 3500,  // USD per ETH (update before deployment)
  
  get tutPrice() {
    return this.targetUSD / 2000000;  // $0.0125 per TUT
  },
  
  get ethRequired() {
    return this.targetUSD / this.ethPrice;  // ~7.14 ETH
  },
  
  get initialFDV() {
    return 50000000 * this.tutPrice;  // ~$625K FDV
  },
  
  // Pool configuration (Uniswap V3)
  pool: {
    feeTier: 3000,  // 0.3% fee tier (standard for new tokens)
    tickLower: -887220,  // Full range for simplicity
    tickUpper: 887220,
  },
};

// ============================================================
// BOOTSTRAP PHASE ALLOCATION (50M TUT)
// ============================================================

const BOOTSTRAP_ALLOCATION = {
  // 1. Staking Rewards Pool (PRIMARY BOOTSTRAP UTILITY)
  stakingRewards: {
    amount: ethers.parseEther("10000000"),  // 10M TUT (20%)
    percentage: 20,
    purpose: "Primary bootstrap utility - governance participation rewards",
    vestingMonths: 0,  // Available for staking rewards distribution
    releaseSchedule: "Distributed over 24+ months based on staking activity",
  },
  
  // 2. DAO Treasury
  daoTreasury: {
    amount: ethers.parseEther("12500000"),  // 12.5M TUT (25%)
    percentage: 25,
    purpose: "Governance-controlled treasury for ecosystem development",
    vestingMonths: 0,  // Immediately available, controlled by DAO
    releaseSchedule: "Released via governance proposals only",
  },
  
  // 3. Tolani Foundation
  foundation: {
    amount: ethers.parseEther("10000000"),  // 10M TUT (20%)
    percentage: 20,
    purpose: "Long-term ecosystem sustainability and development",
    vestingMonths: 48,  // 4-year vesting
    cliffMonths: 12,    // 1-year cliff
    releaseSchedule: "Linear vesting after 12-month cliff",
  },
  
  // 4. Team & Advisors
  team: {
    amount: ethers.parseEther("5000000"),  // 5M TUT (10%)
    percentage: 10,
    purpose: "Core team compensation and advisor allocation",
    vestingMonths: 48,  // 4-year vesting
    cliffMonths: 12,    // 1-year cliff
    releaseSchedule: "Linear vesting after 12-month cliff",
  },
  
  // 5. Community Distribution
  community: {
    amount: ethers.parseEther("5000000"),  // 5M TUT (10%)
    percentage: 10,
    purpose: "Airdrops, early contributors, community building",
    vestingMonths: 0,  // Distributed based on contribution
    releaseSchedule: "Milestone-based distribution to contributors",
  },
  
  // 6. Ecosystem Grants
  grants: {
    amount: ethers.parseEther("4000000"),  // 4M TUT (8%)
    percentage: 8,
    purpose: "Protocol integrations, partnerships, developer incentives",
    vestingMonths: 0,  // Available for grants program
    releaseSchedule: "Released via grants committee approval",
  },
  
  // 7. Liquidity Pools
  liquidity: {
    amount: ethers.parseEther("2000000"),  // 2M TUT (4%)
    percentage: 4,
    purpose: "DEX liquidity for token accessibility",
    vestingMonths: 0,  // Deployed to liquidity pools
    releaseSchedule: "Deployed to Uniswap/DEX at staking launch",
  },
  
  // 8. Operations Reserve
  operations: {
    amount: ethers.parseEther("1500000"),  // 1.5M TUT (3%)
    percentage: 3,
    purpose: "Gasless onboarding subsidies, emergency reserves",
    vestingMonths: 0,  // Available for operations
    releaseSchedule: "Used for operational needs as required",
  },
};

// ============================================================
// GROWTH PHASE ALLOCATION (50M TUT - Future Minting)
// ============================================================

const GROWTH_ALLOCATION = {
  // Training & ESG Rewards
  trainingESG: {
    maxAmount: ethers.parseEther("20000000"),  // 20M TUT (40%)
    percentage: 40,
    purpose: "Training completion rewards, ESG incentives",
    trigger: "When training platform and ESG programs launch",
    estimatedLaunch: "2027",
  },
  
  // Task Bounties (L.O.E)
  bounties: {
    maxAmount: ethers.parseEther("15000000"),  // 15M TUT (30%)
    percentage: 30,
    purpose: "Task completion, bounty programs, contributor rewards",
    trigger: "When L.O.E bounty system is active",
    estimatedLaunch: "2027",
  },
  
  // Additional Staking Rewards
  additionalStaking: {
    maxAmount: ethers.parseEther("10000000"),  // 10M TUT (20%)
    percentage: 20,
    purpose: "Extended staking rewards if bootstrap pool depletes",
    trigger: "If staking pool drops below 2M TUT threshold",
    estimatedLaunch: "2028+",
  },
  
  // Ecosystem Growth
  ecosystemGrowth: {
    maxAmount: ethers.parseEther("5000000"),  // 5M TUT (10%)
    percentage: 10,
    purpose: "Strategic partnerships, expansion initiatives",
    trigger: "DAO governance approval required",
    estimatedLaunch: "As needed",
  },
};

// ============================================================
// STAKING TIERS (Late 2026 Launch)
// ============================================================

const STAKING_TIERS = {
  FLEXIBLE: {
    lockDays: 0,
    rewardMultiplier: 1.0,
    votingBoost: 1.0,
    minStake: ethers.parseEther("100"),  // 100 TUT (~$1.25)
  },
  BRONZE: {
    lockDays: 30,
    rewardMultiplier: 1.25,
    votingBoost: 1.1,
    minStake: ethers.parseEther("1000"),  // 1,000 TUT (~$12.50)
  },
  SILVER: {
    lockDays: 90,
    rewardMultiplier: 1.5,
    votingBoost: 1.25,
    minStake: ethers.parseEther("10000"),  // 10,000 TUT (~$125)
  },
  GOLD: {
    lockDays: 180,
    rewardMultiplier: 2.0,
    votingBoost: 1.5,
    minStake: ethers.parseEther("50000"),  // 50,000 TUT (~$625)
  },
  DIAMOND: {
    lockDays: 365,
    rewardMultiplier: 3.0,
    votingBoost: 2.0,
    minStake: ethers.parseEther("100000"),  // 100,000 TUT (~$1,250)
  },
};

// ============================================================
// TIMELINE & MILESTONES
// ============================================================

const TIMELINE = {
  "2025-Q4": {
    milestone: "Testnet Deployment Complete",
    actions: ["Sepolia contracts deployed", "Frontend operational", "Governance testing"],
  },
  "2026-Q1": {
    milestone: "Documentation & Community Building",
    actions: ["Tokenomics documentation", "Community onboarding", "Ambassador program"],
  },
  "2026-Q2": {
    milestone: "Capital Raising",
    actions: ["Treasury funding", "Partnership discussions", "Legal review"],
  },
  "2026-Q3": {
    milestone: "Mainnet Preparation",
    actions: ["Audit completion", "Mainnet contract deployment", "Liquidity preparation"],
  },
  "2026-Q4": {
    milestone: "STAKING LAUNCH 🚀",
    actions: [
      "Deploy liquidity ($20K-$30K)",
      "Enable staking pools",
      "Community distribution begins",
      "Governance activation",
    ],
  },
  "2027": {
    milestone: "Growth Phase",
    actions: ["Training platform launch", "Bounty programs active", "Multi-chain expansion"],
  },
};

// ============================================================
// WALLET ADDRESSES (Update before mainnet)
// ============================================================

const WALLETS = {
  // Testnet (Sepolia) - Current
  testnet: {
    deployer: process.env.WALLET_ADDRESS || "0x753b53809360bec8742a235D8B60375a57965099",
    treasury: process.env.TREASURY_ADDRESS || "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
    timelock: process.env.TIMELOCK_ADDRESS || "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
    gnosisSafe: process.env.GNOSIS_SAFE_ADDRESS || "0xa56eb5E3990C740C8c58F02eAD263feF02567677",
  },
  
  // Mainnet - TO BE CONFIGURED
  mainnet: {
    deployer: "0x0000000000000000000000000000000000000000",  // UPDATE BEFORE MAINNET
    treasury: "0x0000000000000000000000000000000000000000",  // UPDATE BEFORE MAINNET
    timelock: "0x0000000000000000000000000000000000000000",  // UPDATE BEFORE MAINNET
    foundation: "0x0000000000000000000000000000000000000000", // UPDATE BEFORE MAINNET
    team: "0x0000000000000000000000000000000000000000",      // UPDATE BEFORE MAINNET
    gnosisSafe: "0x0000000000000000000000000000000000000000", // UPDATE BEFORE MAINNET
  },
};

// ============================================================
// VALIDATION HELPERS
// ============================================================

function validateAllocations() {
  const bootstrapTotal = Object.values(BOOTSTRAP_ALLOCATION)
    .reduce((sum, cat) => sum + BigInt(cat.amount), 0n);
  
  const growthTotal = Object.values(GROWTH_ALLOCATION)
    .reduce((sum, cat) => sum + BigInt(cat.maxAmount), 0n);
  
  const expectedBootstrap = TOKEN_CONFIG.initialSupply;
  const expectedGrowth = TOKEN_CONFIG.maxCap - TOKEN_CONFIG.initialSupply;
  
  console.log("\n📊 Allocation Validation:");
  console.log(`  Bootstrap Total: ${ethers.formatEther(bootstrapTotal)} TUT`);
  console.log(`  Expected:        ${ethers.formatEther(expectedBootstrap)} TUT`);
  console.log(`  Match: ${bootstrapTotal === expectedBootstrap ? "✅" : "❌"}`);
  
  console.log(`\n  Growth Total:    ${ethers.formatEther(growthTotal)} TUT`);
  console.log(`  Expected:        ${ethers.formatEther(expectedGrowth)} TUT`);
  console.log(`  Match: ${growthTotal === expectedGrowth ? "✅" : "❌"}`);
  
  return bootstrapTotal === expectedBootstrap && growthTotal === expectedGrowth;
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("TUT TOKENOMICS SUMMARY");
  console.log("=".repeat(60));
  
  console.log("\n📦 TOKEN CONFIGURATION");
  console.log(`  Name:           ${TOKEN_CONFIG.name}`);
  console.log(`  Symbol:         ${TOKEN_CONFIG.symbol}`);
  console.log(`  Initial Supply: ${ethers.formatEther(TOKEN_CONFIG.initialSupply)} TUT`);
  console.log(`  Max Cap:        ${ethers.formatEther(TOKEN_CONFIG.maxCap)} TUT`);
  
  console.log("\n💰 LIQUIDITY CONFIGURATION");
  console.log(`  Target USD:     $${LIQUIDITY_CONFIG.targetUSD.toLocaleString()}`);
  console.log(`  TUT Allocation: ${ethers.formatEther(LIQUIDITY_CONFIG.tutAllocation)} TUT`);
  console.log(`  Initial Price:  $${LIQUIDITY_CONFIG.tutPrice.toFixed(4)} per TUT`);
  console.log(`  ETH Required:   ~${LIQUIDITY_CONFIG.ethRequired.toFixed(2)} ETH`);
  console.log(`  Initial FDV:    $${LIQUIDITY_CONFIG.initialFDV.toLocaleString()}`);
  
  console.log("\n🏗️ BOOTSTRAP ALLOCATION (50M TUT)");
  Object.entries(BOOTSTRAP_ALLOCATION).forEach(([key, val]) => {
    console.log(`  ${key.padEnd(16)} ${ethers.formatEther(val.amount).padStart(12)} TUT (${val.percentage}%)`);
  });
  
  console.log("\n🌱 GROWTH ALLOCATION (50M TUT - Future)");
  Object.entries(GROWTH_ALLOCATION).forEach(([key, val]) => {
    console.log(`  ${key.padEnd(16)} ${ethers.formatEther(val.maxAmount).padStart(12)} TUT (${val.percentage}%)`);
  });
  
  console.log("\n📅 KEY MILESTONES");
  Object.entries(TIMELINE).forEach(([period, data]) => {
    console.log(`  ${period}: ${data.milestone}`);
  });
  
  console.log("\n" + "=".repeat(60));
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  TOKEN_CONFIG,
  LIQUIDITY_CONFIG,
  BOOTSTRAP_ALLOCATION,
  GROWTH_ALLOCATION,
  STAKING_TIERS,
  TIMELINE,
  WALLETS,
  validateAllocations,
  printSummary,
};

// Run summary if executed directly
if (require.main === module) {
  printSummary();
  validateAllocations();
}
