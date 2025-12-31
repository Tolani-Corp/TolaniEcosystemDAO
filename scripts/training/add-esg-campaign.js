/**
 * Add ESG Campaign to TrainingRewards
 * Creates the Tolani ESG Track campaign
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
  TrainingRewards: "0x6C5892afBdf60123edd408404347E59F72D4Eb4c",
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("CREATING ESG CAMPAIGN");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  const rewards = await ethers.getContractAt("TrainingRewardsSimple", CONTRACTS.TrainingRewards);

  // ESG Campaign Parameters
  const campaignId = ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V1"));
  const name = "Tolani ESG Sustainability Track";
  const rewardPerCompletion = ethers.parseUnits("1500", 6);  // 1,500 uTUT
  const budget = ethers.parseUnits("300000", 6);  // 300K uTUT
  const startTime = 0;  // Starts immediately
  const endTime = 0;    // No expiry

  console.log("\n📋 Creating ESG Campaign...");
  console.log(`   ID: ${campaignId.slice(0, 20)}...`);
  console.log(`   Name: ${name}`);
  console.log(`   Reward: ${ethers.formatUnits(rewardPerCompletion, 6)} uTUT per completion`);
  console.log(`   Budget: ${ethers.formatUnits(budget, 6)} uTUT`);

  const tx = await rewards.createCampaign(
    campaignId,
    name,
    rewardPerCompletion,
    budget,
    startTime,
    endTime
  );
  
  const receipt = await tx.wait();
  console.log(`\n   ✅ Campaign created!`);
  console.log(`   Transaction: ${receipt.hash}`);

  // Verify
  const campaign = await rewards.campaigns(campaignId);
  console.log(`\n📊 Verification:`);
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Reward: ${ethers.formatUnits(campaign.rewardPerCompletion, 6)} uTUT`);
  console.log(`   Budget: ${ethers.formatUnits(campaign.budget, 6)} uTUT`);
  console.log(`   Active: ${campaign.active}`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ ESG CAMPAIGN CREATED SUCCESSFULLY!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
