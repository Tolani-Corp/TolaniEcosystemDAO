#!/usr/bin/env node
/**
 * TUT Initial Minting Script
 * Tolani Ecosystem DAO
 * 
 * This script mints the initial 50M TUT supply and distributes
 * to the bootstrap allocation recipients.
 * 
 * Usage:
 *   npx hardhat run scripts/tokenomics/mint-initial-supply.js --network <network>
 * 
 * IMPORTANT: 
 * - Run on testnet first!
 * - Verify all wallet addresses before mainnet
 * - This is a ONE-TIME operation
 */

const { ethers } = require("hardhat");
const { 
  TOKEN_CONFIG, 
  BOOTSTRAP_ALLOCATION, 
  WALLETS,
  validateAllocations,
  printSummary,
} = require("./config");

async function main() {
  console.log("\n🚀 TUT Initial Supply Minting Script");
  console.log("=====================================\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  
  console.log(`Network:  ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);
  
  // Validate allocations
  if (!validateAllocations()) {
    console.error("❌ Allocation validation failed! Check config.js");
    process.exit(1);
  }
  
  // Determine which wallet set to use
  const isMainnet = network.chainId === 1n;
  const wallets = isMainnet ? WALLETS.mainnet : WALLETS.testnet;
  
  // Safety check for mainnet
  if (isMainnet) {
    console.log("\n⚠️  MAINNET DEPLOYMENT DETECTED!");
    console.log("    Please verify all wallet addresses in config.js");
    console.log("    Aborting for safety. Remove this check when ready.\n");
    process.exit(1);
  }
  
  // Get TUT token contract
  const tokenAddress = process.env.TUT_TOKEN_ADDRESS;
  if (!tokenAddress) {
    console.error("❌ TUT_TOKEN_ADDRESS not set in environment!");
    process.exit(1);
  }
  
  console.log(`TUT Token: ${tokenAddress}`);
  
  const TUT = await ethers.getContractAt("TUTTokenReference", tokenAddress);
  
  // Check current supply
  const currentSupply = await TUT.totalSupply();
  const cap = await TUT.cap();
  
  console.log(`\nCurrent Supply: ${ethers.formatEther(currentSupply)} TUT`);
  console.log(`Max Cap:        ${ethers.formatEther(cap)} TUT`);
  
  // Check if deployer has MINTER_ROLE
  const MINTER_ROLE = await TUT.MINTER_ROLE();
  const hasMinterRole = await TUT.hasRole(MINTER_ROLE, deployer.address);
  
  if (!hasMinterRole) {
    console.error(`\n❌ Deployer does not have MINTER_ROLE!`);
    console.error(`   Grant role first or use account with minting permissions.`);
    process.exit(1);
  }
  
  console.log(`✅ Deployer has MINTER_ROLE`);
  
  // Calculate what needs to be minted
  const targetSupply = TOKEN_CONFIG.initialSupply;
  const toMint = targetSupply - currentSupply;
  
  if (toMint <= 0n) {
    console.log(`\n✅ Initial supply already minted!`);
    console.log(`   Current: ${ethers.formatEther(currentSupply)} TUT`);
    console.log(`   Target:  ${ethers.formatEther(targetSupply)} TUT`);
    return;
  }
  
  console.log(`\n📊 Minting Plan:`);
  console.log(`   To Mint: ${ethers.formatEther(toMint)} TUT`);
  
  // Print distribution plan
  console.log(`\n📦 Distribution Plan:`);
  console.log("─".repeat(50));
  
  const distributions = [
    { name: "Staking Rewards Pool", amount: BOOTSTRAP_ALLOCATION.stakingRewards.amount, wallet: wallets.treasury },
    { name: "DAO Treasury", amount: BOOTSTRAP_ALLOCATION.daoTreasury.amount, wallet: wallets.treasury },
    { name: "Tolani Foundation", amount: BOOTSTRAP_ALLOCATION.foundation.amount, wallet: wallets.gnosisSafe },
    { name: "Team & Advisors", amount: BOOTSTRAP_ALLOCATION.team.amount, wallet: wallets.gnosisSafe },
    { name: "Community", amount: BOOTSTRAP_ALLOCATION.community.amount, wallet: wallets.treasury },
    { name: "Ecosystem Grants", amount: BOOTSTRAP_ALLOCATION.grants.amount, wallet: wallets.treasury },
    { name: "Liquidity", amount: BOOTSTRAP_ALLOCATION.liquidity.amount, wallet: wallets.treasury },
    { name: "Operations", amount: BOOTSTRAP_ALLOCATION.operations.amount, wallet: wallets.treasury },
  ];
  
  distributions.forEach(d => {
    console.log(`   ${d.name.padEnd(22)} ${ethers.formatEther(d.amount).padStart(14)} TUT → ${d.wallet.slice(0, 10)}...`);
  });
  
  // Confirm before proceeding
  console.log("\n⏳ Starting minting in 5 seconds... (Ctrl+C to cancel)");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Execute minting
  console.log("\n🔄 Minting tokens...\n");
  
  for (const dist of distributions) {
    try {
      console.log(`   Minting ${ethers.formatEther(dist.amount)} TUT to ${dist.name}...`);
      const tx = await TUT.mint(dist.wallet, dist.amount);
      const receipt = await tx.wait();
      console.log(`   ✅ TX: ${receipt.hash}`);
    } catch (error) {
      console.error(`   ❌ Failed to mint ${dist.name}: ${error.message}`);
      throw error;
    }
  }
  
  // Verify final supply
  const finalSupply = await TUT.totalSupply();
  console.log(`\n✅ Minting Complete!`);
  console.log(`   Final Supply: ${ethers.formatEther(finalSupply)} TUT`);
  console.log(`   Max Cap:      ${ethers.formatEther(cap)} TUT`);
  console.log(`   Remaining:    ${ethers.formatEther(cap - finalSupply)} TUT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
