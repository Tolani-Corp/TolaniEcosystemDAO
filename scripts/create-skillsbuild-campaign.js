/**
 * Create IBM SkillsBuild Test Campaign
 * 
 * This creates a campaign that rewards learners for completing IBM SkillsBuild courses.
 * 
 * Run: npx hardhat run scripts/create-skillsbuild-campaign.js --network base
 */

const hre = require("hardhat");
const ethers = hre.ethers;

// Contract addresses
const TRAINING_REWARDS = "0x1fec9c4dB67b6d3531171936C13760E2a61415D7";

// Campaign configuration
const CAMPAIGNS = [
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-general")),
    name: "IBM SkillsBuild - General Courses",
    rewardPerCompletion: 50, // 50 uTUT per course (0.50 TUT equivalent)
    budget: 100000, // 100,000 uTUT total budget (1,000 TUT)
    startTime: 0, // Start immediately
    endTime: 0, // No end time (perpetual)
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-ai")),
    name: "IBM SkillsBuild - AI & Data Science",
    rewardPerCompletion: 100, // 100 uTUT per course (1.00 TUT equivalent)
    budget: 50000, // 50,000 uTUT total budget
    startTime: 0,
    endTime: 0,
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-cybersecurity")),
    name: "IBM SkillsBuild - Cybersecurity",
    rewardPerCompletion: 75, // 75 uTUT per course
    budget: 50000,
    startTime: 0,
    endTime: 0,
  },
];

async function main() {
  console.log("🎓 Creating IBM SkillsBuild Campaigns");
  console.log("=".repeat(50));
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Get contract instance
  const trainingRewards = await ethers.getContractAt(
    "TrainingRewardsSimple",
    TRAINING_REWARDS,
    signer
  );
  
  // Check if signer has CAMPAIGN_MANAGER_ROLE
  const CAMPAIGN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"));
  const isManager = await trainingRewards.hasRole(CAMPAIGN_MANAGER_ROLE, signer.address);
  
  if (!isManager) {
    console.log("\n❌ Signer does not have CAMPAIGN_MANAGER_ROLE");
    console.log("   You need to execute this via Gnosis Safe");
    console.log("\n📋 Manual steps for EACH campaign:");
    console.log("   1. Go to https://app.safe.global/home?safe=base:0xa56eb5E3990C740C8c58F02eAD263feF02567677");
    console.log("   2. New Transaction → Contract Interaction");
    console.log("   3. Enter TrainingRewards address:", TRAINING_REWARDS);
    console.log("   4. Select 'createCampaign' function");
    
    for (const campaign of CAMPAIGNS) {
      console.log("\n" + "─".repeat(50));
      console.log(`📌 Campaign: ${campaign.name}`);
      console.log("   campaignId:", campaign.id);
      console.log("   name:", campaign.name);
      console.log("   rewardPerCompletion:", campaign.rewardPerCompletion);
      console.log("   budget:", campaign.budget);
      console.log("   startTime:", campaign.startTime);
      console.log("   endTime:", campaign.endTime);
    }
    
    console.log("\n" + "─".repeat(50));
    console.log("\n💡 Or grant CAMPAIGN_MANAGER_ROLE to deployer first:");
    console.log("   role:", CAMPAIGN_MANAGER_ROLE);
    console.log("   account:", signer.address);
    return;
  }
  
  // Create each campaign
  for (const campaign of CAMPAIGNS) {
    console.log(`\n🔄 Creating campaign: ${campaign.name}`);
    
    // Check if campaign already exists
    const existing = await trainingRewards.campaigns(campaign.id);
    if (existing.budget > 0) {
      console.log(`   ⏭️ Campaign already exists (budget: ${existing.budget})`);
      continue;
    }
    
    const tx = await trainingRewards.createCampaign(
      campaign.id,
      campaign.name,
      campaign.rewardPerCompletion,
      campaign.budget,
      campaign.startTime,
      campaign.endTime
    );
    
    console.log("   Transaction:", tx.hash);
    await tx.wait();
    console.log("   ✅ Campaign created!");
  }
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 CAMPAIGN SUMMARY");
  console.log("=".repeat(50));
  
  for (const campaign of CAMPAIGNS) {
    const data = await trainingRewards.campaigns(campaign.id);
    console.log(`\n${campaign.name}:`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Reward: ${data.rewardPerCompletion} uTUT per completion`);
    console.log(`   Budget: ${data.budget} uTUT (${Number(data.budget) / 100} TUT)`);
    console.log(`   Spent: ${data.spent} uTUT`);
    console.log(`   Active: ${data.active}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
