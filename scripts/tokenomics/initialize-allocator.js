#!/usr/bin/env node
/**
 * TUT Token Allocator Pool Initialization
 * Tolani Ecosystem DAO
 * 
 * This script initializes the TokenAllocator contract pools
 * with the defined limits from the tokenomics configuration.
 * 
 * Usage:
 *   npx hardhat run scripts/tokenomics/initialize-allocator.js --network <network>
 */

const { ethers } = require("hardhat");
const { BOOTSTRAP_ALLOCATION } = require("./config");

// Pool categories (must match TokenAllocator.sol enum)
const Category = {
  TRAINING_REWARDS: 0,
  TASK_BOUNTIES: 1,
  ECOSYSTEM_GRANTS: 2,
  COMMUNITY_INCENTIVES: 3,
  RESERVE: 4,
  TOLANI_FOUNDATION: 5,
};

// Pool configurations with limits
const POOL_CONFIG = [
  {
    category: Category.TRAINING_REWARDS,
    name: "Training Rewards",
    limit: ethers.parseEther("12500000"),  // 12.5M TUT
    description: "Learning & onboarding rewards, ESG incentives",
  },
  {
    category: Category.TASK_BOUNTIES,
    name: "Task Bounties",
    limit: ethers.parseEther("10000000"),  // 10M TUT
    description: "L.O.E task completion, contributor rewards",
  },
  {
    category: Category.ECOSYSTEM_GRANTS,
    name: "Ecosystem Grants",
    limit: ethers.parseEther("10000000"),  // 10M TUT
    description: "Protocol integrations, partnerships",
  },
  {
    category: Category.COMMUNITY_INCENTIVES,
    name: "Community Incentives",
    limit: ethers.parseEther("7500000"),   // 7.5M TUT
    description: "Airdrops, contests, community building",
  },
  {
    category: Category.RESERVE,
    name: "Reserve",
    limit: ethers.parseEther("5000000"),   // 5M TUT
    description: "Emergency/future use, DAO vote required",
  },
  {
    category: Category.TOLANI_FOUNDATION,
    name: "Tolani Foundation",
    limit: ethers.parseEther("12500000"),  // 12.5M TUT
    description: "Long-term ecosystem sustainability",
  },
];

async function main() {
  console.log("\n📦 TUT Token Allocator Initialization");
  console.log("======================================\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  
  console.log(`Network:  ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Hardcoded Sepolia addresses
  const SEPOLIA_ADDRESSES = {
    tokenAllocator: '0x2b3B2a6036099B144b0C5fB95a26b775785B3360',
  };
  
  // Get allocator address from config or environment
  let allocatorAddress = process.env.TOKEN_ALLOCATOR_ADDRESS;
  
  if (!allocatorAddress) {
    // Use hardcoded Sepolia address
    if (Number(network.chainId) === 11155111) {
      allocatorAddress = SEPOLIA_ADDRESSES.tokenAllocator;
    } else {
      // Try to get from frontend config
      try {
        const { CONTRACT_ADDRESSES, CHAIN_IDS } = require("../../frontend/src/config/contracts");
        const chainId = Number(network.chainId);
        const addresses = CONTRACT_ADDRESSES[chainId];
        allocatorAddress = addresses?.tokenAllocator;
      } catch (e) {
        console.error("❌ Could not find TokenAllocator address!");
        console.log("   Set TOKEN_ALLOCATOR_ADDRESS in .env");
        process.exit(1);
      }
    }
  }
  
  if (!allocatorAddress) {
    console.error("❌ TOKEN_ALLOCATOR_ADDRESS not configured!");
    process.exit(1);
  }
  
  console.log(`TokenAllocator: ${allocatorAddress}`);
  
  // Get contract
  const TokenAllocator = await ethers.getContractAt("TokenAllocator", allocatorAddress);
  
  // Check if deployer has GOVERNANCE_ROLE
  const GOVERNANCE_ROLE = await TokenAllocator.GOVERNANCE_ROLE();
  const hasRole = await TokenAllocator.hasRole(GOVERNANCE_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error(`\n❌ Deployer does not have GOVERNANCE_ROLE!`);
    process.exit(1);
  }
  console.log(`✅ Deployer has GOVERNANCE_ROLE`);
  
  // Check current pool states
  console.log(`\n📊 Current Pool States:`);
  console.log("─".repeat(70));
  
  for (const pool of POOL_CONFIG) {
    try {
      const info = await TokenAllocator.getPoolInfo(pool.category);
      console.log(`   ${pool.name.padEnd(20)} | Limit: ${ethers.formatEther(info.limit).padStart(12)} TUT | Active: ${info.active}`);
    } catch (e) {
      console.log(`   ${pool.name.padEnd(20)} | Not initialized`);
    }
  }
  
  // Initialize pools
  console.log(`\n🔄 Initializing Pools...`);
  console.log("─".repeat(70));
  
  let totalLimit = 0n;
  
  for (const pool of POOL_CONFIG) {
    try {
      // Check if already initialized
      const info = await TokenAllocator.getPoolInfo(pool.category);
      if (info.limit > 0n) {
        console.log(`   ⏭️  ${pool.name} already initialized (${ethers.formatEther(info.limit)} TUT)`);
        totalLimit += info.limit;
        continue;
      }
    } catch (e) {
      // Not initialized, continue
    }
    
    console.log(`   🔄 Initializing ${pool.name} with ${ethers.formatEther(pool.limit)} TUT limit...`);
    
    try {
      const tx = await TokenAllocator.initializePool(pool.category, pool.limit);
      const receipt = await tx.wait();
      console.log(`   ✅ ${pool.name} initialized | TX: ${receipt.hash.slice(0, 18)}...`);
      totalLimit += pool.limit;
    } catch (error) {
      console.error(`   ❌ Failed to initialize ${pool.name}: ${error.message}`);
    }
  }
  
  // Summary
  console.log(`\n✅ Pool Initialization Complete!`);
  console.log(`\n📋 Summary:`);
  console.log("─".repeat(70));
  
  for (const pool of POOL_CONFIG) {
    try {
      const info = await TokenAllocator.getPoolInfo(pool.category);
      console.log(`   ${pool.name.padEnd(22)} | ${ethers.formatEther(info.limit).padStart(14)} TUT | ${pool.description}`);
    } catch (e) {
      console.log(`   ${pool.name.padEnd(22)} | ERROR`);
    }
  }
  
  console.log("─".repeat(70));
  console.log(`   ${"TOTAL".padEnd(22)} | ${ethers.formatEther(totalLimit).padStart(14)} TUT`);
  
  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Fund pools using fundPool(category, amount)`);
  console.log(`   2. Distribute tokens using distribute(category, recipient, amount, reason)`);
  console.log(`   3. Monitor via getPoolInfo(category)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
