/**
 * Grant REWARDER_ROLE to the relayer wallet
 * 
 * This allows the relayer to call grantReward() on TrainingRewardsSimple
 * when IBM SkillsBuild webhooks are received.
 * 
 * Run: npx hardhat run scripts/grant-rewarder-role.js --network base
 */

const hre = require("hardhat");
const ethers = hre.ethers;

// Contract addresses
const TRAINING_REWARDS = "0x1fec9c4dB67b6d3531171936C13760E2a61415D7";

// Relayer wallet - this will receive REWARDER_ROLE
// Using the deployer wallet as relayer (update if you have a dedicated relayer)
const RELAYER_WALLET = "0x3203009FC71927c8484645B3dF17863d1eF3A21a";

async function main() {
  console.log("🔐 Granting REWARDER_ROLE to Relayer Wallet");
  console.log("=".repeat(50));
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Get contract instance
  const trainingRewards = await ethers.getContractAt(
    "TrainingRewardsSimple",
    TRAINING_REWARDS,
    signer
  );
  
  // Calculate role hash
  const REWARDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDER_ROLE"));
  console.log("\nREWARDER_ROLE hash:", REWARDER_ROLE);
  console.log("Relayer wallet:", RELAYER_WALLET);
  
  // Check if already has role
  const hasRole = await trainingRewards.hasRole(REWARDER_ROLE, RELAYER_WALLET);
  if (hasRole) {
    console.log("\n✅ Relayer already has REWARDER_ROLE!");
    return;
  }
  
  // Check if signer has DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const isAdmin = await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  
  if (!isAdmin) {
    console.log("\n❌ Signer does not have DEFAULT_ADMIN_ROLE");
    console.log("   You need to execute this via Gnosis Safe");
    console.log("\n📋 Manual steps:");
    console.log("   1. Go to https://app.safe.global/home?safe=base:0xa56eb5E3990C740C8c58F02eAD263feF02567677");
    console.log("   2. New Transaction → Contract Interaction");
    console.log("   3. Enter TrainingRewards address:", TRAINING_REWARDS);
    console.log("   4. Select 'grantRole' function");
    console.log("   5. role:", REWARDER_ROLE);
    console.log("   6. account:", RELAYER_WALLET);
    console.log("   7. Submit & sign with Safe owners");
    return;
  }
  
  // Grant role
  console.log("\n🔄 Granting REWARDER_ROLE...");
  const tx = await trainingRewards.grantRole(REWARDER_ROLE, RELAYER_WALLET);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ REWARDER_ROLE granted successfully!");
  
  // Verify
  const verified = await trainingRewards.hasRole(REWARDER_ROLE, RELAYER_WALLET);
  console.log("\n🔍 Verification:", verified ? "✅ Confirmed" : "❌ Failed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
