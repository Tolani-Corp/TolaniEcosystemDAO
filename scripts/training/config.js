/**
 * IBM SkillsBuild Integration Configuration
 * Tolani Labs + Tolani Ecosystem DAO
 * 
 * Created: December 31, 2025
 * Blueprint Version: v1
 * 
 * This configuration defines the uTUT micro-utility token and
 * training rewards system for IBM SkillsBuild integration.
 */

const { ethers } = require("hardhat");

// ============================================================
// uTUT TOKEN CONFIGURATION (6 decimals)
// ============================================================

const UTUT_CONFIG = {
  name: "Tolani Micro Utility Token",
  symbol: "uTUT",
  decimals: 6,  // Micro-utility - smaller units than TUT
  
  // Chain deployment
  primaryChain: "base",  // Base L2 for low-cost operations
  secondaryChain: "world-chain",  // World Chain for identity/PBH
  
  // Conversion rate
  // 1 uTUT (6 decimals) = 10^12 wei TUT (18 decimals)
  // 1 TUT = 1,000,000 uTUT
  conversionFactor: ethers.parseUnits("1", 12),  // 10^12
  
  // Initial cap (matches Training Rewards bootstrap allocation)
  // 12.5M TUT → 12.5 trillion uTUT
  bootstrapCap: ethers.parseUnits("12500000000000", 6),  // 12.5T uTUT
  
  // Growth phase cap addition
  // 20M TUT → 20 trillion uTUT
  growthCap: ethers.parseUnits("20000000000000", 6),  // 20T uTUT
};

// ============================================================
// TRAINING CAMPAIGNS (IBM SkillsBuild Tracks)
// ============================================================

const TRAINING_CAMPAIGNS = {
  // Phase 1: Foundation (0-3 months)
  constructionTech: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V1")),
    name: "Tolani Construction Tech Track",
    skillsBuildModules: [
      "Project Management Fundamentals",
      "Data Analysis with Python",
      "Cloud Computing Basics",
    ],
    rewardPerModule: ethers.parseUnits("500", 6),  // 500 uTUT per module
    rewardPerCompletion: ethers.parseUnits("2000", 6),  // 2,000 uTUT for full track
    budget: ethers.parseUnits("500000", 6),  // 500K uTUT initial budget
    estimatedLearners: 100,
  },
  
  aiCloud: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V1")),
    name: "Tolani AI & Cloud Track",
    skillsBuildModules: [
      "AI Foundations",
      "Machine Learning Basics",
      "IBM Cloud Essentials",
      "Data Science Methodology",
    ],
    rewardPerModule: ethers.parseUnits("750", 6),  // 750 uTUT per module
    rewardPerCompletion: ethers.parseUnits("4000", 6),  // 4,000 uTUT for full track
    budget: ethers.parseUnits("1000000", 6),  // 1M uTUT initial budget
    estimatedLearners: 100,
  },
  
  esgTrack: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_V1")),
    name: "Tolani ESG Track",
    skillsBuildModules: [
      "Sustainability and AI",
      "Enterprise Design Thinking",
      "Business Communication",
    ],
    rewardPerModule: ethers.parseUnits("400", 6),  // 400 uTUT per module
    rewardPerCompletion: ethers.parseUnits("1500", 6),  // 1,500 uTUT for full track
    budget: ethers.parseUnits("300000", 6),  // 300K uTUT initial budget
    estimatedLearners: 50,
  },
  
  // Phase 2: Pilot expansion
  cybersecurity: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CYBERSECURITY_V1")),
    name: "Tolani Cybersecurity Track",
    skillsBuildModules: [
      "Cybersecurity Fundamentals",
      "Network Security",
      "Security Operations",
    ],
    rewardPerModule: ethers.parseUnits("600", 6),
    rewardPerCompletion: ethers.parseUnits("2500", 6),
    budget: ethers.parseUnits("500000", 6),
    estimatedLearners: 75,
    launchPhase: 2,
  },
  
  softSkills: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_SOFT_SKILLS_V1")),
    name: "Tolani Professional Skills Track",
    skillsBuildModules: [
      "Communication Skills",
      "Problem Solving",
      "Collaboration and Teamwork",
    ],
    rewardPerModule: ethers.parseUnits("300", 6),
    rewardPerCompletion: ethers.parseUnits("1200", 6),
    budget: ethers.parseUnits("200000", 6),
    estimatedLearners: 100,
    launchPhase: 2,
  },
};

// ============================================================
// SESSION CONFIGURATION
// ============================================================

const SESSION_CONFIG = {
  // Default session duration (24 hours)
  defaultDuration: 24 * 60 * 60,  // 24 hours in seconds
  
  // Session tags
  tags: {
    TRAINING: ethers.keccak256(ethers.toUtf8Bytes("TRAINING")),
    ESG: ethers.keccak256(ethers.toUtf8Bytes("ESG")),
    BOUNTY: ethers.keccak256(ethers.toUtf8Bytes("BOUNTY")),
    PAYROLL: ethers.keccak256(ethers.toUtf8Bytes("PAYROLL")),
  },
  
  // Session limits
  maxSessionsPerUser: 10,  // Max concurrent sessions per learner
  maxRewardPerSession: ethers.parseUnits("10000", 6),  // 10K uTUT max per session
};

// ============================================================
// GAS TREASURY CONFIGURATION
// ============================================================

const GAS_TREASURY_CONFIG = {
  // Reimbursement limits (in ETH)
  maxPerTransaction: ethers.parseEther("0.01"),    // ~$25 at $2500/ETH
  maxDailyPerRelayer: ethers.parseEther("0.5"),    // ~$1,250/day per relayer
  maxDailyGlobal: ethers.parseEther("2"),          // ~$5,000/day global
  
  // Initial funding from Operations Reserve
  // 0.5M TUT worth of ETH (~$6,250 at $0.0125/TUT)
  initialFundingTUT: ethers.parseEther("500000"),
  
  // Estimated transactions per day
  estimatedDailyTransactions: 200,
  estimatedGasPerTransaction: 250000,  // Gas units
  
  // Buffer for gas price fluctuations
  gasPriceBuffer: 1.5,  // 50% buffer
};

// ============================================================
// IMPLEMENTATION PHASES
// ============================================================

const IMPLEMENTATION_PHASES = {
  phase1: {
    name: "Foundation",
    duration: "0-3 months",
    objectives: [
      "Deploy core contracts to testnets (Sepolia + Base Sepolia)",
      "Integrate Alchemy RPC and webhooks",
      "Create initial Tolani Track mappings",
      "Build verification pipeline for SkillsBuild badges",
    ],
    contracts: [
      "uTUT",
      "TUTConverter",
      "SessionKeyRegistry",
      "SessionInvoker",
      "GasTreasuryModule",
      "TrainingRewards",
    ],
    campaigns: ["constructionTech", "aiCloud", "esgTrack"],
    targetLearners: 0,  // Testing only
  },
  
  phase2: {
    name: "Pilot",
    duration: "3-6 months",
    objectives: [
      "Run live pilot cohort (20-50 learners)",
      "Deploy to Base mainnet + World Chain mainnet",
      "Issue uTUT rewards for verified completions",
      "Collect data for ESG + workforce reports",
    ],
    campaigns: ["constructionTech", "aiCloud", "esgTrack", "cybersecurity", "softSkills"],
    targetLearners: 50,
    kpis: {
      completionRate: 0.7,  // 70% target
      averageReward: ethers.parseUnits("2500", 6),  // 2,500 uTUT
      activeWallets: 40,
    },
  },
  
  phase3: {
    name: "Scale",
    duration: "6-18 months",
    objectives: [
      "Expand to multiple geographies (Africa, LATAM)",
      "Onboard third-party partners",
      "Add new SkillsBuild modules/languages",
      "Implement detailed dashboards",
    ],
    targetLearners: 500,
    targetRegions: ["Nigeria", "Ghana", "Kenya", "Mexico", "Brazil"],
  },
};

// ============================================================
// KPIs & METRICS
// ============================================================

const KPIS = {
  training: {
    enrollmentsPerTrack: "# of SkillsBuild enrollments per track",
    completionRate: "Completion rate per track (%)",
    averageTimeToCompletion: "Average time to completion (days)",
  },
  
  onChain: {
    totalUtutDistributed: "Total uTUT distributed per campaign",
    averageRewardPerLearner: "Average reward per learner (uTUT)",
    activeWallets: "# of active wallets holding uTUT",
    conversionVolume: "TUT ↔ uTUT conversion volume",
  },
  
  workforce: {
    learnersHiredByTolani: "# hired by Tolani Corp",
    learnersPlacedWithPartners: "# placed with partners",
    retentionRate: "Retention rate for trained staff (%)",
  },
  
  esg: {
    regionsServed: "# of regions served",
    demographicData: "Demographic breakdown (where appropriate)",
    esgTasksCompleted: "ESG-specific tasks completed",
  },
};

// ============================================================
// CONTRACT DEPLOYMENT ORDER
// ============================================================

const DEPLOYMENT_ORDER = [
  {
    order: 1,
    contract: "uTUT",
    dependencies: [],
    chain: "base",
    initArgs: ["owner", "initialCap"],
  },
  {
    order: 2,
    contract: "TUTConverter",
    dependencies: ["uTUT"],
    chain: "base",
    initArgs: ["owner", "tutToken", "ututToken"],
  },
  {
    order: 3,
    contract: "SessionKeyRegistry",
    dependencies: [],
    chain: "base",
    initArgs: ["owner"],
  },
  {
    order: 4,
    contract: "GasTreasuryModule",
    dependencies: [],
    chain: "base",
    initArgs: ["owner"],
  },
  {
    order: 5,
    contract: "TrainingRewards",
    dependencies: ["uTUT", "SessionKeyRegistry"],
    chain: "base",
    initArgs: ["owner", "ututToken", "registry"],
  },
  {
    order: 6,
    contract: "SessionInvoker",
    dependencies: ["SessionKeyRegistry", "TrainingRewards", "GasTreasuryModule"],
    chain: "base",
    initArgs: ["owner", "sessionRegistry", "trainingRewards", "gasTreasury"],
  },
];

// ============================================================
// ROLE CONFIGURATION
// ============================================================

const ROLES = {
  uTUT: {
    MINTER_ROLE: ["TrainingRewards", "ESGRewards"],
    PAUSER_ROLE: ["Timelock"],
    UPGRADER_ROLE: ["Timelock"],
  },
  
  TUTConverter: {
    TREASURY_ROLE: ["Treasury", "Safe"],
    PAUSER_ROLE: ["Timelock"],
  },
  
  SessionKeyRegistry: {
    SESSION_MANAGER_ROLE: ["Backend", "Safe"],
    INVOKER_ROLE: ["SessionInvoker"],
    PAUSER_ROLE: ["Timelock"],
  },
  
  TrainingRewards: {
    REWARDER_ROLE: ["SessionInvoker"],
    CAMPAIGN_MANAGER_ROLE: ["Safe", "Timelock"],
    PAUSER_ROLE: ["Timelock"],
  },
  
  GasTreasuryModule: {
    RELAYER_ROLE: ["RelayerAddress"],
    TREASURER_ROLE: ["Treasury", "Safe"],
    PAUSER_ROLE: ["Timelock"],
  },
  
  SessionInvoker: {
    INVOKER_ROLE: ["RelayerAddress"],
    PAUSER_ROLE: ["Timelock"],
  },
};

// ============================================================
// RISK MITIGATIONS
// ============================================================

const RISKS = {
  bridgeL2Risk: {
    description: "L2 or bridge technical/economic issues",
    mitigation: [
      "Keep canonical TUT on Ethereum",
      "Limit bridged amounts",
      "Use reputable bridges only",
      "Maintain emergency pause controls",
    ],
  },
  
  badgeVerificationSpoofing: {
    description: "Fraudulent training completions",
    mitigation: [
      "Strict verification workflow",
      "Random audits",
      "Cross-check with IBM APIs",
      "Risk-based payout throttling",
    ],
  },
  
  tokenMisuse: {
    description: "uTUT used outside intended utility",
    mitigation: [
      "Clear Terms & Disclosures",
      "Controlled distribution",
      "No investment marketing",
      "Utility-only messaging",
    ],
  },
  
  regulatoryUncertainty: {
    description: "Jurisdictional interpretation differences",
    mitigation: [
      "Maintain legal counsel",
      "Emphasize utility and services",
      "No investment promises",
      "Jurisdiction-specific compliance",
    ],
  },
};

// ============================================================
// VALIDATION & SUMMARY
// ============================================================

function validateIntegrationConfig() {
  console.log("\n📊 IBM SkillsBuild Integration Validation:");
  
  // Validate campaign budgets
  let totalCampaignBudget = 0n;
  Object.values(TRAINING_CAMPAIGNS).forEach(campaign => {
    totalCampaignBudget += BigInt(campaign.budget);
  });
  
  console.log(`\n  Total Campaign Budget: ${ethers.formatUnits(totalCampaignBudget, 6)} uTUT`);
  console.log(`  Bootstrap Cap:         ${ethers.formatUnits(UTUT_CONFIG.bootstrapCap, 6)} uTUT`);
  console.log(`  Within Cap: ${totalCampaignBudget <= BigInt(UTUT_CONFIG.bootstrapCap) ? "✅" : "❌"}`);
  
  // Validate gas treasury funding
  console.log(`\n  Gas Treasury Funding:  ${ethers.formatEther(GAS_TREASURY_CONFIG.initialFundingTUT)} TUT worth`);
  console.log(`  Est. Daily Gas Cost:   ${GAS_TREASURY_CONFIG.estimatedDailyTransactions} txns × ${GAS_TREASURY_CONFIG.estimatedGasPerTransaction} gas`);
  
  return true;
}

function printIntegrationSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("IBM SKILLSBUILD INTEGRATION SUMMARY");
  console.log("=".repeat(60));
  
  console.log("\n📦 uTUT TOKEN");
  console.log(`  Name:        ${UTUT_CONFIG.name}`);
  console.log(`  Symbol:      ${UTUT_CONFIG.symbol}`);
  console.log(`  Decimals:    ${UTUT_CONFIG.decimals}`);
  console.log(`  Chain:       ${UTUT_CONFIG.primaryChain}`);
  console.log(`  Conversion:  1 TUT = 1,000,000 uTUT`);
  
  console.log("\n📚 TRAINING CAMPAIGNS (Phase 1)");
  Object.entries(TRAINING_CAMPAIGNS)
    .filter(([_, c]) => !c.launchPhase || c.launchPhase === 1)
    .forEach(([key, campaign]) => {
      console.log(`  ${campaign.name}`);
      console.log(`    Reward/Module:     ${ethers.formatUnits(campaign.rewardPerModule, 6)} uTUT`);
      console.log(`    Reward/Completion: ${ethers.formatUnits(campaign.rewardPerCompletion, 6)} uTUT`);
      console.log(`    Budget:            ${ethers.formatUnits(campaign.budget, 6)} uTUT`);
    });
  
  console.log("\n⛽ GAS TREASURY");
  console.log(`  Max/Transaction:     ${ethers.formatEther(GAS_TREASURY_CONFIG.maxPerTransaction)} ETH`);
  console.log(`  Max Daily/Relayer:   ${ethers.formatEther(GAS_TREASURY_CONFIG.maxDailyPerRelayer)} ETH`);
  console.log(`  Max Daily Global:    ${ethers.formatEther(GAS_TREASURY_CONFIG.maxDailyGlobal)} ETH`);
  
  console.log("\n📅 IMPLEMENTATION PHASES");
  Object.entries(IMPLEMENTATION_PHASES).forEach(([phase, data]) => {
    console.log(`  ${data.name} (${data.duration}): ${data.targetLearners} learners`);
  });
  
  console.log("\n" + "=".repeat(60));
}

// ============================================================
// DEPLOYED CONTRACT ADDRESSES
// ============================================================

const DEPLOYED_ADDRESSES = {
  sepolia: {
    // Core DAO Contracts
    TUT: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
    Governor: "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f",
    Timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
    Treasury: "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
    TokenAllocator: "0x2b3B2a6036099B144b0C5fB95a26b775785B3360",
    
    // Training Contracts (Simple - Non-Upgradeable)
    training: {
      uTUT: "0xc9D0D68aC9A4678Fb58CB7AE5c4c6b0B7cf60E38",
      TUTConverter: "0x82D131Fbf9aC7629499cC05DA21b7dD317e5748D",
      SessionKeyRegistry: "0xF9e6A163852D7B73B8F5A13cAbAe529C5b4c4c27",
      GasTreasuryModule: "0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd",
      TrainingRewards: "0x6C5892afBdf60123edd408404347E59F72D4Eb4c",
      SessionInvoker: "0x46Fc54f90023098655b237E3543609BF8dCB938e",
    },
    deployedAt: "2025-12-31",
    verified: true,
  },
  
  base: {
    // To be deployed
    training: {},
    deployedAt: null,
    verified: false,
  },
  
  baseSepolia: {
    // To be deployed
    training: {},
    deployedAt: null,
    verified: false,
  },
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  UTUT_CONFIG,
  TRAINING_CAMPAIGNS,
  SESSION_CONFIG,
  GAS_TREASURY_CONFIG,
  IMPLEMENTATION_PHASES,
  KPIS,
  DEPLOYMENT_ORDER,
  ROLES,
  RISKS,
  DEPLOYED_ADDRESSES,
  validateIntegrationConfig,
  printIntegrationSummary,
};

// Run summary if executed directly
if (require.main === module) {
  printIntegrationSummary();
  validateIntegrationConfig();
}
