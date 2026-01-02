/**
 * STRESS TEST SCENARIO 1: High Volume Training Enrollments
 * 
 * Simulates:
 * - Creating multiple campaigns rapidly
 * - Mass learner reward distributions
 * - Budget depletion handling
 * - Concurrent reward claims
 * 
 * Metrics tracked:
 * - Gas costs per operation
 * - Transaction success rate
 * - Time to process batch
 */

require("dotenv").config();
const { ethers } = require("hardhat");

// Contract addresses (Base Sepolia)
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  trainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC"
};

// ABIs
const TRAINING_REWARDS_ABI = [
  "function createCampaign(bytes32 campaignId, string name, uint256 rewardPerCompletion, uint256 budget, uint256 startTime, uint256 endTime)",
  "function grantReward(address learner, bytes32 campaignId, bytes32 completionProof)",
  "function grantDirectReward(address learner, uint256 amount, string reason)",
  "function getCampaign(bytes32 campaignId) view returns (string name, uint256 rewardPerCompletion, uint256 budget, uint256 spent, uint256 startTime, uint256 endTime, bool active)",
  "function getCampaignCount() view returns (uint256)",
  "function getLearnerTotalRewards(address learner) view returns (uint256)",
  "function campaignIds(uint256) view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function CAMPAIGN_MANAGER_ROLE() view returns (bytes32)",
  "function REWARDER_ROLE() view returns (bytes32)"
];

const UTUT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

// Test configuration
const CONFIG = {
  numCampaigns: 5,           // Create 5 campaigns
  learnersPerCampaign: 10,   // 10 learners complete each
  rewardAmount: ethers.parseUnits("5", 6),  // 5 uTUT per completion
  campaignBudget: ethers.parseUnits("100", 6), // 100 uTUT per campaign
};

// Metrics collection
const metrics = {
  campaignsCreated: 0,
  rewardsDistributed: 0,
  totalGasUsed: 0n,
  failedTxs: 0,
  startTime: 0,
  endTime: 0,
  txTimes: []
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🏋️  STRESS TEST SCENARIO 1: High Volume Training");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log(`\n📍 Operator: ${deployer.address}`);
  
  // Connect to contracts
  const trainingRewards = new ethers.Contract(
    CONTRACTS.trainingRewards,
    TRAINING_REWARDS_ABI,
    deployer
  );
  
  const uTUT = new ethers.Contract(CONTRACTS.uTUT, UTUT_ABI, deployer);
  
  // Check roles
  const CAMPAIGN_MANAGER = await trainingRewards.CAMPAIGN_MANAGER_ROLE();
  const REWARDER = await trainingRewards.REWARDER_ROLE();
  
  const hasManager = await trainingRewards.hasRole(CAMPAIGN_MANAGER, deployer.address);
  const hasRewarder = await trainingRewards.hasRole(REWARDER, deployer.address);
  
  console.log(`\n🔑 Roles:`);
  console.log(`   Campaign Manager: ${hasManager ? "✅" : "❌"}`);
  console.log(`   Rewarder: ${hasRewarder ? "✅" : "❌"}`);
  
  if (!hasManager || !hasRewarder) {
    console.log("\n❌ Missing required roles. Cannot proceed.");
    return;
  }
  
  // Initial state
  const campaignCount = await trainingRewards.getCampaignCount();
  const initialSupply = await uTUT.totalSupply();
  
  console.log(`\n📊 Initial State:`);
  console.log(`   Campaign Count: ${campaignCount}`);
  console.log(`   uTUT Supply: ${ethers.formatUnits(initialSupply, 6)}`);
  
  metrics.startTime = Date.now();
  
  // ==============================================
  // PHASE 1: Create Multiple Campaigns
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("📚 PHASE 1: Creating Campaigns");
  console.log("-".repeat(40));
  
  const campaignIds = [];
  
  for (let i = 0; i < CONFIG.numCampaigns; i++) {
    const txStart = Date.now();
    try {
      // Generate unique campaign ID
      const campaignId = ethers.keccak256(ethers.toUtf8Bytes(`stress-test-campaign-${Date.now()}-${i}`));
      
      // Campaign timing: start now, end in 30 days
      const now = Math.floor(Date.now() / 1000);
      const startTime = now;
      const endTime = now + (30 * 24 * 60 * 60); // 30 days
      
      const tx = await trainingRewards.createCampaign(
        campaignId,
        `Stress Test Course ${i + 1}`,
        CONFIG.rewardAmount,      // rewardPerCompletion
        CONFIG.campaignBudget,    // budget
        startTime,
        endTime,
        { gasLimit: 500000 }
      );
      
      const receipt = await tx.wait();
      const txEnd = Date.now();
      
      campaignIds.push(campaignId);
      
      metrics.campaignsCreated++;
      metrics.totalGasUsed += receipt.gasUsed;
      metrics.txTimes.push(txEnd - txStart);
      
      console.log(`   ✅ Campaign ${i + 1}: ${campaignId.slice(0, 18)}... (${receipt.gasUsed} gas, ${txEnd - txStart}ms)`);
      
    } catch (error) {
      metrics.failedTxs++;
      console.log(`   ❌ Campaign ${i + 1} failed: ${error.message.slice(0, 50)}`);
    }
  }
  
  // ==============================================
  // PHASE 2: Mass Reward Distribution
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("🎓 PHASE 2: Distributing Rewards");
  console.log("-".repeat(40));
  
  // Generate test learner addresses (deterministic)
  const learners = [];
  for (let i = 0; i < CONFIG.learnersPerCampaign; i++) {
    const wallet = ethers.Wallet.createRandom();
    learners.push(wallet.address);
  }
  
  console.log(`   Generated ${learners.length} test learner addresses`);
  
  for (let c = 0; c < campaignIds.length; c++) {
    const campaignId = campaignIds[c];
    console.log(`\n   📖 Campaign ${c + 1} rewards:`);
    
    for (let l = 0; l < learners.length; l++) {
      const txStart = Date.now();
      try {
        // Generate completion proof
        const completionProof = ethers.keccak256(
          ethers.solidityPacked(["address", "bytes32", "uint256"], [learners[l], campaignId, Date.now()])
        );
        
        const tx = await trainingRewards.grantReward(
          learners[l],
          campaignId,
          completionProof,
          { gasLimit: 300000 }
        );
        
        const receipt = await tx.wait();
        const txEnd = Date.now();
        
        metrics.rewardsDistributed++;
        metrics.totalGasUsed += receipt.gasUsed;
        metrics.txTimes.push(txEnd - txStart);
        
        if (l % 5 === 0) {
          process.stdout.write(`      Learner ${l + 1}/${learners.length}...\r`);
        }
        
      } catch (error) {
        metrics.failedTxs++;
        // Budget exhausted is expected
        if (error.message.includes("BudgetExhausted")) {
          console.log(`      ⚠️  Budget exhausted at learner ${l + 1} (expected)`);
          break;
        }
      }
    }
    console.log(`      ✅ Completed campaign ${c + 1} rewards`);
  }
  
  metrics.endTime = Date.now();
  
  // ==============================================
  // PHASE 3: Results & Metrics
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("📊 STRESS TEST RESULTS");
  console.log("-".repeat(40));
  
  const finalCampaignCount = await trainingRewards.getCampaignCount();
  const finalSupply = await uTUT.totalSupply();
  
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const avgTxTime = metrics.txTimes.length > 0 
    ? metrics.txTimes.reduce((a, b) => a + b, 0) / metrics.txTimes.length 
    : 0;
  
  console.log(`\n   ⏱️  Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`   📊 Campaigns Created: ${metrics.campaignsCreated}/${CONFIG.numCampaigns}`);
  console.log(`   🎓 Rewards Distributed: ${metrics.rewardsDistributed}`);
  console.log(`   ❌ Failed Transactions: ${metrics.failedTxs}`);
  console.log(`   ⛽ Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
  console.log(`   📈 Avg TX Time: ${avgTxTime.toFixed(0)}ms`);
  
  console.log(`\n   📈 State Changes:`);
  console.log(`      Campaigns: ${campaignCount} → ${finalCampaignCount}`);
  console.log(`      uTUT Minted: ${ethers.formatUnits(finalSupply - initialSupply, 6)}`);
  
  // Success criteria
  const successRate = (metrics.campaignsCreated + metrics.rewardsDistributed) / 
    ((metrics.campaignsCreated + metrics.rewardsDistributed) + metrics.failedTxs) * 100;
  
  console.log(`\n   🎯 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 90) {
    console.log("   ✅ STRESS TEST PASSED");
  } else if (successRate >= 70) {
    console.log("   ⚠️  STRESS TEST PASSED WITH WARNINGS");
  } else {
    console.log("   ❌ STRESS TEST FAILED");
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  return metrics;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
