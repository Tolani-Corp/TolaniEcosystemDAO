/**
 * Configure TrainingRewards Campaigns on Base Sepolia
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const TRAINING_ADDRESS = "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC";
const UTUT_ADDRESS = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";

const TRAINING_ABI = [
  "function createCampaign(bytes32 campaignId, uint256 rewardPerCompletion, uint256 budget) external",
  "function campaigns(bytes32) view returns (uint256 rewardPerCompletion, uint256 budget, uint256 spent, bool active)",
  "function updateCampaignReward(bytes32 campaignId, uint256 newReward) external",
  "function updateCampaignBudget(bytes32 campaignId, uint256 additionalBudget) external",
  "function setCampaignActive(bytes32 campaignId, bool active) external",
  "function CAMPAIGN_MANAGER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
];

const UTUT_ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
];

// Campaign definitions
const CAMPAIGNS = {
  CONSTRUCTION: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V1")),
    name: "Construction Tech",
    reward: ethers.parseUnits("2", 6), // 2 uTUT per completion
    budget: ethers.parseUnits("10000", 6), // 10,000 uTUT total budget
  },
  AI_CLOUD: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V1")),
    name: "AI & Cloud",
    reward: ethers.parseUnits("4", 6), // 4 uTUT per completion
    budget: ethers.parseUnits("20000", 6), // 20,000 uTUT total budget
  },
  ESG: {
    id: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V1")),
    name: "ESG Sustainability",
    reward: ethers.parseUnits("3", 6), // 3 uTUT per completion
    budget: ethers.parseUnits("15000", 6), // 15,000 uTUT total budget
  },
};

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n📋 Configuring TrainingRewards Campaigns\n`);
  console.log(`Wallet: ${signer.address}`);

  const training = new ethers.Contract(TRAINING_ADDRESS, TRAINING_ABI, signer);
  const uTUT = new ethers.Contract(UTUT_ADDRESS, UTUT_ABI, signer);

  // Check if TrainingRewards has MINTER_ROLE on uTUT
  const MINTER_ROLE = await uTUT.MINTER_ROLE();
  const trainingHasMinter = await uTUT.hasRole(MINTER_ROLE, TRAINING_ADDRESS);
  console.log(`\nTrainingRewards has MINTER_ROLE on uTUT: ${trainingHasMinter}`);

  if (!trainingHasMinter) {
    console.log(`⏳ Granting MINTER_ROLE to TrainingRewards...`);
    const tx = await uTUT.grantRole(MINTER_ROLE, TRAINING_ADDRESS);
    await tx.wait();
    console.log(`✅ MINTER_ROLE granted`);
  }

  // Check current campaigns
  console.log(`\n📋 Current Campaign Status:`);
  for (const [key, config] of Object.entries(CAMPAIGNS)) {
    const campaign = await training.campaigns(config.id);
    const [reward, budget, spent, active] = campaign;
    
    console.log(`\n${config.name}:`);
    console.log(`   Current Reward: ${ethers.formatUnits(reward, 6)} uTUT`);
    console.log(`   Target Reward: ${ethers.formatUnits(config.reward, 6)} uTUT`);
    console.log(`   Budget: ${ethers.formatUnits(budget, 6)} uTUT`);
    console.log(`   Spent: ${ethers.formatUnits(spent, 6)} uTUT`);
    console.log(`   Active: ${active}`);

    // Update reward if incorrect
    if (reward != config.reward) {
      console.log(`\n   ⏳ Updating reward to ${ethers.formatUnits(config.reward, 6)} uTUT...`);
      try {
        const tx = await training.updateCampaignReward(config.id, config.reward);
        await tx.wait();
        console.log(`   ✅ Reward updated`);
      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
      }
    }
  }

  // Verify final state
  console.log(`\n\n📋 FINAL Campaign Status:`);
  for (const [key, config] of Object.entries(CAMPAIGNS)) {
    const campaign = await training.campaigns(config.id);
    const [reward, budget, spent, active] = campaign;
    
    console.log(`\n${config.name}:`);
    console.log(`   Reward: ${ethers.formatUnits(reward, 6)} uTUT per completion`);
    console.log(`   Budget: ${ethers.formatUnits(budget, 6)} uTUT`);
    console.log(`   Active: ${active}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
