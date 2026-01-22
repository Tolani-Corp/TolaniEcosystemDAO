/**
 * Generate Safe Transaction Builder JSON (Correct Signatures)
 * 
 * Run: npx hardhat run scripts/generate-safe-batch-v2.js --network base
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Contract addresses (Base Mainnet)
const ADDRESSES = {
  TrainingRewards: "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526",
  Relayer: "0x3203009FC71927c8484645B3dF17863d1eF3A21a",
  Safe: "0x57dd8B744fd527c4cbd983d2878a29c5116ab855"
};

// Role hashes
const ROLES = {
  REWARDER_ROLE: "0xbeec13769b5f410b0584f69811bfd923818456d5edcf426b0e31cf90eed7a3f6"
};

// IBM SkillsBuild Campaigns
const CAMPAIGNS = [
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-general")),
    name: "IBM SkillsBuild - General Courses",
    rewardAmount: 50,  // 50 uTUT (0.50 TUT)
    budget: 100000,    // 100,000 uTUT total budget
    startTime: 0,      // Start immediately
    endTime: 0         // No end time
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-ai-data")),
    name: "IBM SkillsBuild - AI & Data Science",
    rewardAmount: 100, // 100 uTUT (1.00 TUT)
    budget: 50000,     // 50,000 uTUT
    startTime: 0,
    endTime: 0
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-cybersecurity")),
    name: "IBM SkillsBuild - Cybersecurity",
    rewardAmount: 75,  // 75 uTUT (0.75 TUT)
    budget: 50000,     // 50,000 uTUT
    startTime: 0,
    endTime: 0
  }
];

async function main() {
  console.log("🔧 Generating Safe Transaction Builder JSON (v2 - Correct Signatures)...\n");

  // Correct ABI for TrainingRewardsSimple
  const trainingAbi = [
    "function grantRole(bytes32 role, address account) external",
    "function createCampaign(bytes32 campaignId, string calldata name, uint256 rewardPerCompletion, uint256 budget, uint256 startTime, uint256 endTime) external"
  ];

  const trainingInterface = new ethers.Interface(trainingAbi);
  const transactions = [];

  // Transaction 1: Grant REWARDER_ROLE to Relayer
  console.log("📝 Transaction 1: Grant REWARDER_ROLE to Relayer");
  const tx1Data = trainingInterface.encodeFunctionData("grantRole", [
    ROLES.REWARDER_ROLE,
    ADDRESSES.Relayer
  ]);
  transactions.push({
    to: ADDRESSES.TrainingRewards,
    value: "0",
    data: tx1Data
  });
  console.log(`   To: ${ADDRESSES.TrainingRewards}`);
  console.log(`   Data: ${tx1Data}\n`);

  // Transactions 2-4: Create campaigns with correct signature
  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    console.log(`📝 Transaction ${i + 2}: Create Campaign "${campaign.name}"`);
    console.log(`   Campaign ID: ${campaign.id}`);
    
    const txData = trainingInterface.encodeFunctionData("createCampaign", [
      campaign.id,
      campaign.name,
      campaign.rewardAmount,
      campaign.budget,
      campaign.startTime,
      campaign.endTime
    ]);
    
    transactions.push({
      to: ADDRESSES.TrainingRewards,
      value: "0",
      data: txData
    });
    console.log(`   Reward: ${campaign.rewardAmount} uTUT per completion`);
    console.log(`   Budget: ${campaign.budget} uTUT`);
    console.log(`   Data: ${txData.slice(0, 66)}...\n`);
  }

  // Create Safe Transaction Builder JSON
  const safeTxBatch = {
    version: "1.0",
    chainId: "8453",
    createdAt: Date.now(),
    meta: {
      name: "Tolani Labs - Setup TrainingRewards v2",
      description: "Grant REWARDER_ROLE and create IBM SkillsBuild campaigns (correct signatures)",
      txBuilderVersion: "1.16.3",
      createdFromSafeAddress: ADDRESSES.Safe
    },
    transactions: transactions
  };

  // Save to file
  const outputPath = path.join(__dirname, "../deployments/safe-tx-batch-v2.json");
  fs.writeFileSync(outputPath, JSON.stringify(safeTxBatch, null, 2));

  console.log("=" .repeat(60));
  console.log("✅ Safe Transaction Batch v2 Generated!\n");
  console.log(`📁 Saved to: ${outputPath}\n`);
  
  console.log("📋 NEXT STEPS:");
  console.log("1. Open Safe on Base: https://app.safe.global/home?safe=base:0x57dd8B744fd527c4cbd983d2878a29c5116ab855");
  console.log("2. New Transaction → Transaction Builder");
  console.log("3. Upload safe-tx-batch-v2.json");
  console.log("4. Review and Execute\n");

  console.log("📊 CAMPAIGN IDS (for webhook integration):");
  for (const campaign of CAMPAIGNS) {
    console.log(`   ${campaign.name}: ${campaign.id}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
