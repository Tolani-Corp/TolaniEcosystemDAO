#!/usr/bin/env node
/**
 * TUT Staking Pool Initialization Script
 * Tolani Ecosystem DAO
 * 
 * This script initializes the staking pool with rewards and
 * configures the reward distribution parameters.
 * 
 * Target Launch: Late 2026
 * 
 * Usage:
 *   npx hardhat run scripts/tokenomics/initialize-staking.js --network <network>
 */

const { ethers } = require("hardhat");
const { 
  BOOTSTRAP_ALLOCATION,
  STAKING_TIERS,
  LIQUIDITY_CONFIG,
} = require("./config");

// Staking pool configuration
const STAKING_CONFIG = {
  // Initial rewards to add to the pool
  initialRewards: ethers.parseEther("2000000"),  // 2M TUT for first year
  
  // Distribution duration (in seconds)
  rewardsDuration: 365 * 24 * 60 * 60,  // 1 year
  
  // This gives roughly:
  // 2M TUT / 365 days = ~5,479 TUT/day in rewards
  // At $0.0125/TUT = ~$68/day in rewards distributed
};

async function main() {
  console.log("\n🔒 TUT Staking Pool Initialization");
  console.log("===================================\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  
  console.log(`Network:  ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Safety check for mainnet
  if (network.chainId === 1n) {
    console.log("\n⚠️  MAINNET DEPLOYMENT - Extra verification required!");
    console.log("    Remove this check when ready for mainnet launch.\n");
    process.exit(1);
  }
  
  // Get contract addresses from environment
  const tokenAddress = process.env.TUT_TOKEN_ADDRESS;
  const stakingAddress = process.env.STAKING_POOL_ADDRESS;
  
  if (!tokenAddress || !stakingAddress) {
    // Try to get from contract config
    const { CONTRACT_ADDRESSES, CHAIN_IDS } = require("../../frontend/src/config/contracts");
    const chainId = Number(network.chainId);
    const addresses = CONTRACT_ADDRESSES[chainId];
    
    if (!addresses) {
      console.error("❌ Contract addresses not found!");
      process.exit(1);
    }
    
    // Note: StakingPool address would need to be added to config
    console.error("❌ STAKING_POOL_ADDRESS not set in environment!");
    console.log("\n   Add to .env: STAKING_POOL_ADDRESS=<address>");
    process.exit(1);
  }
  
  console.log(`TUT Token:    ${tokenAddress}`);
  console.log(`Staking Pool: ${stakingAddress}`);
  
  // Get contracts
  const TUT = await ethers.getContractAt("TUTTokenReference", tokenAddress);
  const StakingPool = await ethers.getContractAt("StakingPool", stakingAddress);
  
  // Check balances and approvals
  const deployerBalance = await TUT.balanceOf(deployer.address);
  console.log(`\nDeployer TUT Balance: ${ethers.formatEther(deployerBalance)} TUT`);
  
  if (deployerBalance < STAKING_CONFIG.initialRewards) {
    console.error(`\n❌ Insufficient TUT balance for rewards!`);
    console.error(`   Have:    ${ethers.formatEther(deployerBalance)} TUT`);
    console.error(`   Need:    ${ethers.formatEther(STAKING_CONFIG.initialRewards)} TUT`);
    process.exit(1);
  }
  
  // Check current pool state
  const totalStaked = await StakingPool.totalStaked();
  const rewardsEndTime = await StakingPool.rewardsEndTime();
  
  console.log(`\n📊 Current Pool State:`);
  console.log(`   Total Staked:    ${ethers.formatEther(totalStaked)} TUT`);
  console.log(`   Rewards End:     ${new Date(Number(rewardsEndTime) * 1000).toISOString()}`);
  
  // Check if we have REWARDS_MANAGER_ROLE
  const REWARDS_MANAGER_ROLE = await StakingPool.REWARDS_MANAGER_ROLE();
  const hasRole = await StakingPool.hasRole(REWARDS_MANAGER_ROLE, deployer.address);
  
  if (!hasRole) {
    console.error(`\n❌ Deployer does not have REWARDS_MANAGER_ROLE!`);
    process.exit(1);
  }
  console.log(`✅ Deployer has REWARDS_MANAGER_ROLE`);
  
  // Print staking tiers
  console.log(`\n🎯 Staking Tiers:`);
  console.log("─".repeat(60));
  Object.entries(STAKING_TIERS).forEach(([tier, config]) => {
    const minStakeUSD = Number(ethers.formatEther(config.minStake)) * LIQUIDITY_CONFIG.tutPrice;
    console.log(`   ${tier.padEnd(10)} | Lock: ${String(config.lockDays).padStart(3)}d | ${config.rewardMultiplier}x rewards | Min: ${ethers.formatEther(config.minStake)} TUT (~$${minStakeUSD.toFixed(2)})`);
  });
  
  // Approve tokens for staking pool
  console.log(`\n🔄 Approving TUT for staking pool...`);
  const approveTx = await TUT.approve(stakingAddress, STAKING_CONFIG.initialRewards);
  await approveTx.wait();
  console.log(`   ✅ Approved ${ethers.formatEther(STAKING_CONFIG.initialRewards)} TUT`);
  
  // Add rewards to pool
  console.log(`\n🔄 Adding rewards to staking pool...`);
  console.log(`   Amount:   ${ethers.formatEther(STAKING_CONFIG.initialRewards)} TUT`);
  console.log(`   Duration: ${STAKING_CONFIG.rewardsDuration / (24 * 60 * 60)} days`);
  
  const addRewardsTx = await StakingPool.addRewards(
    STAKING_CONFIG.initialRewards,
    STAKING_CONFIG.rewardsDuration
  );
  const receipt = await addRewardsTx.wait();
  console.log(`   ✅ TX: ${receipt.hash}`);
  
  // Verify new state
  const newRewardsEndTime = await StakingPool.rewardsEndTime();
  const rewardRate = await StakingPool.rewardRate();
  
  console.log(`\n✅ Staking Pool Initialized!`);
  console.log(`   Rewards End:  ${new Date(Number(newRewardsEndTime) * 1000).toISOString()}`);
  console.log(`   Reward Rate:  ${ethers.formatEther(rewardRate)} TUT/second`);
  console.log(`   Daily Rate:   ~${ethers.formatEther(rewardRate * 86400n)} TUT/day`);
  
  console.log(`\n📋 Summary:`);
  console.log(`   Total Staking Budget:    ${ethers.formatEther(BOOTSTRAP_ALLOCATION.stakingRewards.amount)} TUT`);
  console.log(`   Initial Pool Funding:    ${ethers.formatEther(STAKING_CONFIG.initialRewards)} TUT`);
  console.log(`   Remaining for Future:    ${ethers.formatEther(BOOTSTRAP_ALLOCATION.stakingRewards.amount - STAKING_CONFIG.initialRewards)} TUT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
