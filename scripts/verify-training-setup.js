/**
 * Verify TrainingRewards setup is complete
 */
const { ethers } = require("hardhat");

const TRAINING_REWARDS = "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526";
const RELAYER = "0x3203009FC71927c8484645B3dF17863d1eF3A21a";
const SAFE = "0x57dd8B744fd527c4cbd983d2878a29c5116ab855";

const REWARDER_ROLE = "0xbeec13769b5f410b0584f69811bfd923818456d5edcf426b0e31cf90eed7a3f6";
const CAMPAIGN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

const CAMPAIGN_IDS = [
  { name: "General", id: "0x7d5cdddb86bdc460f01c202fe957700c31670ac987c0da99963486c0162644eb" },
  { name: "AI & Data", id: "0x082d7acd839ba88ceb6e05e3c3378d85a8a4338916f97c26802e4ad2e914cb85" },
  { name: "Cybersecurity", id: "0x43244ccd99b75b50c6b61d76f6f9c0b1b320f2f0331fde4374cc99f577145dda" }
];

async function main() {
  console.log("🔍 Verifying TrainingRewards Setup...\n");

  const training = await ethers.getContractAt(
    [
      "function hasRole(bytes32 role, address account) view returns (bool)",
      "function campaigns(bytes32) view returns (string name, uint256 rewardPerCompletion, uint256 budget, uint256 spent, uint256 startTime, uint256 endTime, bool active)"
    ],
    TRAINING_REWARDS
  );

  // Check roles
  console.log("📋 ROLES:");
  const safeHasAdmin = await training.hasRole(DEFAULT_ADMIN_ROLE, SAFE);
  const relayerHasRewarder = await training.hasRole(REWARDER_ROLE, RELAYER);
  const safeHasCampaignMgr = await training.hasRole(CAMPAIGN_MANAGER_ROLE, SAFE);
  
  console.log(`   Safe has DEFAULT_ADMIN: ${safeHasAdmin ? '✅' : '❌'}`);
  console.log(`   Safe has CAMPAIGN_MANAGER: ${safeHasCampaignMgr ? '✅' : '❌'}`);
  console.log(`   Relayer has REWARDER_ROLE: ${relayerHasRewarder ? '✅' : '❌'}`);

  // Check campaigns
  console.log("\n📋 CAMPAIGNS:");
  for (const campaign of CAMPAIGN_IDS) {
    try {
      const data = await training.campaigns(campaign.id);
      if (data.budget > 0) {
        console.log(`   ${campaign.name}: ✅`);
        console.log(`      Name: ${data.name}`);
        console.log(`      Reward: ${data.rewardPerCompletion} uTUT`);
        console.log(`      Budget: ${data.budget} uTUT`);
        console.log(`      Active: ${data.active}`);
      } else {
        console.log(`   ${campaign.name}: ❌ Not created`);
      }
    } catch (e) {
      console.log(`   ${campaign.name}: ❌ Error - ${e.message}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  const allReady = safeHasAdmin && relayerHasRewarder;
  if (allReady) {
    console.log("✅ TrainingRewards is configured correctly!");
    console.log("\n🚀 Ready to process IBM SkillsBuild webhooks!");
  } else {
    console.log("⚠️  Setup incomplete:");
    if (!relayerHasRewarder) console.log("   - Relayer needs REWARDER_ROLE");
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
