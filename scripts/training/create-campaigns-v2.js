/**
 * Create NEW TrainingRewards Campaigns with correct configuration
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const TRAINING_ADDRESS = "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC";

const TRAINING_ABI = [
  "function createCampaign(bytes32 campaignId, string name, uint256 rewardPerCompletion, uint256 budget, uint256 startTime, uint256 endTime) external",
  "function campaigns(bytes32) view returns (string name, uint256 rewardPerCompletion, uint256 budget, uint256 spent, uint256 startTime, uint256 endTime, bool active)",
  "function setCampaignActive(bytes32 campaignId, bool active) external",
  "function addBudget(bytes32 campaignId, uint256 amount) external",
  "function CAMPAIGN_MANAGER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

// NEW Campaign definitions with V2 suffix
const CAMPAIGNS = {
  CONSTRUCTION_V2: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V2")),
    name: "Construction Tech Track V2",
    reward: ethers.parseUnits("2", 6), // 2 uTUT per completion
    budget: ethers.parseUnits("10000", 6), // 10,000 uTUT total budget
  },
  AI_CLOUD_V2: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V2")),
    name: "AI & Cloud Track V2",
    reward: ethers.parseUnits("4", 6), // 4 uTUT per completion
    budget: ethers.parseUnits("20000", 6), // 20,000 uTUT total budget
  },
  ESG_V2: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V2")),
    name: "ESG Sustainability Track V2",
    reward: ethers.parseUnits("3", 6), // 3 uTUT per completion
    budget: ethers.parseUnits("15000", 6), // 15,000 uTUT total budget
  },
};

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n🆕 Creating NEW Training Campaigns (V2)\n`);
  console.log(`Wallet: ${signer.address}`);

  const training = new ethers.Contract(TRAINING_ADDRESS, TRAINING_ABI, signer);

  // Check manager role
  const managerRole = await training.CAMPAIGN_MANAGER_ROLE();
  const hasManager = await training.hasRole(managerRole, signer.address);
  console.log(`Has CAMPAIGN_MANAGER_ROLE: ${hasManager}`);

  if (!hasManager) {
    console.log(`❌ No manager role - cannot create campaigns`);
    return;
  }

  // Create new campaigns
  for (const [key, config] of Object.entries(CAMPAIGNS)) {
    console.log(`\n⏳ Creating ${config.name}...`);
    console.log(`   Campaign ID: ${config.id}`);
    console.log(`   Reward: ${ethers.formatUnits(config.reward, 6)} uTUT`);
    console.log(`   Budget: ${ethers.formatUnits(config.budget, 6)} uTUT`);

    // Check if campaign already exists
    try {
      const existing = await training.campaigns(config.id);
      if (existing.budget > 0n) {
        console.log(`   ⚠️ Campaign already exists - skipping`);
        continue;
      }
    } catch (e) {
      // Campaign doesn't exist - good
    }

    try {
      const tx = await training.createCampaign(
        config.id,
        config.name,
        config.reward,
        config.budget,
        0, // startTime = now
        0  // endTime = no end
      );
      console.log(`   TX: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Created!`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  // Verify campaigns
  console.log(`\n\n📋 FINAL Campaign Status:`);
  for (const [key, config] of Object.entries(CAMPAIGNS)) {
    try {
      const campaign = await training.campaigns(config.id);
      console.log(`\n${config.name}:`);
      console.log(`   Reward: ${ethers.formatUnits(campaign.rewardPerCompletion, 6)} uTUT per completion`);
      console.log(`   Budget: ${ethers.formatUnits(campaign.budget, 6)} uTUT`);
      console.log(`   Spent: ${ethers.formatUnits(campaign.spent, 6)} uTUT`);
      console.log(`   Active: ${campaign.active}`);
    } catch (e) {
      console.log(`\n${key}: Error reading - ${e.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
