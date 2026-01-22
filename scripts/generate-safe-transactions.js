/**
 * Generate Safe Transaction Builder JSON
 * 
 * This script generates transaction data for Gnosis Safe Transaction Builder
 * Run: npx hardhat run scripts/generate-safe-transactions.js --network base
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Contract addresses (Base Mainnet)
const ADDRESSES = {
  uTUT: "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4",
  TrainingRewards: "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526",
  Relayer: "0x3203009FC71927c8484645B3dF17863d1eF3A21a",
  Safe: "0x57dd8B744fd527c4cbd983d2878a29c5116ab855"
};

// Role hashes
const ROLES = {
  MINTER_ROLE: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
  REWARDER_ROLE: "0xbeec13769b5f410b0584f69811bfd923818456d5edcf426b0e31cf90eed7a3f6",
  CAMPAIGN_MANAGER_ROLE: "0x5a7d8a3e5b9f1c2d4e6f8a0b3c5d7e9f1a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2"
};

// IBM SkillsBuild Campaigns
const CAMPAIGNS = [
  {
    name: "IBM SkillsBuild - General Courses",
    rewardAmount: 50,  // 50 uTUT (0.50 TUT)
    maxBudget: 100000, // 100,000 uTUT total budget
    courseIds: ["general", "professional-skills", "workplace-skills"]
  },
  {
    name: "IBM SkillsBuild - AI & Data Science",
    rewardAmount: 100, // 100 uTUT (1.00 TUT)
    maxBudget: 50000,  // 50,000 uTUT
    courseIds: ["ai-fundamentals", "data-science", "machine-learning", "watson"]
  },
  {
    name: "IBM SkillsBuild - Cybersecurity",
    rewardAmount: 75,  // 75 uTUT (0.75 TUT)
    maxBudget: 50000,  // 50,000 uTUT
    courseIds: ["cybersecurity", "security-analyst", "threat-intelligence"]
  }
];

async function main() {
  console.log("🔧 Generating Safe Transaction Builder JSON...\n");

  // Get contract interfaces
  const uTUTAbi = [
    "function grantRole(bytes32 role, address account) external"
  ];
  const trainingRewardsAbi = [
    "function grantRole(bytes32 role, address account) external",
    "function createCampaign(string name, uint256 rewardPerCompletion, uint256 maxBudget) external returns (uint256)"
  ];

  const uTUTInterface = new ethers.Interface(uTUTAbi);
  const trainingInterface = new ethers.Interface(trainingRewardsAbi);

  // Build transactions array
  const transactions = [];

  // Transaction 1: Grant MINTER_ROLE on uTUT to TrainingRewards
  console.log("📝 Transaction 1: Grant MINTER_ROLE on uTUT to TrainingRewards");
  const tx1Data = uTUTInterface.encodeFunctionData("grantRole", [
    ROLES.MINTER_ROLE,
    ADDRESSES.TrainingRewards
  ]);
  transactions.push({
    to: ADDRESSES.uTUT,
    value: "0",
    data: tx1Data,
    contractMethod: {
      name: "grantRole",
      inputs: [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]
    },
    contractInputsValues: {
      role: ROLES.MINTER_ROLE,
      account: ADDRESSES.TrainingRewards
    }
  });
  console.log(`   To: ${ADDRESSES.uTUT}`);
  console.log(`   Data: ${tx1Data}\n`);

  // Transaction 2: Grant REWARDER_ROLE on TrainingRewards to Relayer
  console.log("📝 Transaction 2: Grant REWARDER_ROLE on TrainingRewards to Relayer");
  const tx2Data = trainingInterface.encodeFunctionData("grantRole", [
    ROLES.REWARDER_ROLE,
    ADDRESSES.Relayer
  ]);
  transactions.push({
    to: ADDRESSES.TrainingRewards,
    value: "0",
    data: tx2Data,
    contractMethod: {
      name: "grantRole",
      inputs: [
        { name: "role", type: "bytes32", internalType: "bytes32" },
        { name: "account", type: "address", internalType: "address" }
      ]
    },
    contractInputsValues: {
      role: ROLES.REWARDER_ROLE,
      account: ADDRESSES.Relayer
    }
  });
  console.log(`   To: ${ADDRESSES.TrainingRewards}`);
  console.log(`   Data: ${tx2Data}\n`);

  // Transactions 3-5: Create campaigns
  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    console.log(`📝 Transaction ${i + 3}: Create Campaign "${campaign.name}"`);
    
    const txData = trainingInterface.encodeFunctionData("createCampaign", [
      campaign.name,
      campaign.rewardAmount,
      campaign.maxBudget
    ]);
    
    transactions.push({
      to: ADDRESSES.TrainingRewards,
      value: "0",
      data: txData,
      contractMethod: {
        name: "createCampaign",
        inputs: [
          { name: "name", type: "string", internalType: "string" },
          { name: "rewardPerCompletion", type: "uint256", internalType: "uint256" },
          { name: "maxBudget", type: "uint256", internalType: "uint256" }
        ]
      },
      contractInputsValues: {
        name: campaign.name,
        rewardPerCompletion: campaign.rewardAmount.toString(),
        maxBudget: campaign.maxBudget.toString()
      }
    });
    console.log(`   Reward: ${campaign.rewardAmount} uTUT per completion`);
    console.log(`   Budget: ${campaign.maxBudget} uTUT`);
    console.log(`   Data: ${txData}\n`);
  }

  // Create Safe Transaction Builder JSON format
  const safeTxBatch = {
    version: "1.0",
    chainId: "8453",
    createdAt: Date.now(),
    meta: {
      name: "Tolani Labs - Setup TrainingRewards",
      description: "Grant roles and create IBM SkillsBuild campaigns",
      txBuilderVersion: "1.16.3",
      createdFromSafeAddress: ADDRESSES.Safe,
      createdFromOwnerAddress: "",
      checksum: ""
    },
    transactions: transactions
  };

  // Save to file
  const outputPath = path.join(__dirname, "../deployments/safe-tx-batch-setup.json");
  fs.writeFileSync(outputPath, JSON.stringify(safeTxBatch, null, 2));

  console.log("=" .repeat(60));
  console.log("✅ Safe Transaction Batch Generated!\n");
  console.log(`📁 Saved to: ${outputPath}\n`);
  
  console.log("📋 NEXT STEPS:");
  console.log("1. Go to: https://app.safe.global/home?safe=base:0x57dd8B744fd527c4cbd983d2878a29c5116ab855");
  console.log("2. Click 'New Transaction' → 'Transaction Builder'");
  console.log("3. Click the upload icon (top right) and select the JSON file");
  console.log("4. Review all 5 transactions");
  console.log("5. Click 'Create Batch' → Sign & Execute\n");

  console.log("=" .repeat(60));
  console.log("📊 TRANSACTION SUMMARY:");
  console.log("=" .repeat(60));
  console.log("\n1️⃣  uTUT.grantRole(MINTER_ROLE, TrainingRewards)");
  console.log("    → Allows TrainingRewards to mint uTUT for rewards\n");
  console.log("2️⃣  TrainingRewards.grantRole(REWARDER_ROLE, Relayer)");
  console.log("    → Allows relayer wallet to call markCompletion()\n");
  console.log("3️⃣  TrainingRewards.createCampaign('General Courses', 50, 100000)");
  console.log("    → 50 uTUT per completion, 100K budget\n");
  console.log("4️⃣  TrainingRewards.createCampaign('AI & Data Science', 100, 50000)");
  console.log("    → 100 uTUT per completion, 50K budget\n");
  console.log("5️⃣  TrainingRewards.createCampaign('Cybersecurity', 75, 50000)");
  console.log("    → 75 uTUT per completion, 50K budget\n");
  console.log("=" .repeat(60));

  // Also output individual calldata for manual entry
  console.log("\n📝 MANUAL CALLDATA (if needed):\n");
  transactions.forEach((tx, i) => {
    console.log(`Transaction ${i + 1}:`);
    console.log(`  To: ${tx.to}`);
    console.log(`  Data: ${tx.data}`);
    console.log();
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
