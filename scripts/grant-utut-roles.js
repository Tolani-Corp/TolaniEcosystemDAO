/**
 * Grant uTUT roles from Original Deployer
 * 
 * Run with original deployer private key:
 * PRIVATE_KEY=<original_deployer_key> npx hardhat run scripts/grant-utut-roles.js --network base
 */

const { ethers } = require("hardhat");

const UTUT = "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4";
const SAFE = "0x57dd8B744fd527c4cbd983d2878a29c5116ab855";
const TRAINING_REWARDS = "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526";

const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🔑 Using wallet:", signer.address);
  
  if (signer.address.toLowerCase() !== "0xAdBcb3Ba539b741c386d28705858Af699856B928".toLowerCase()) {
    console.log("⚠️  Warning: Expected original deployer 0xAdBcb3Ba...");
    console.log("   Make sure you're using the correct private key!");
  }

  const uTUT = await ethers.getContractAt(
    [
      "function grantRole(bytes32 role, address account) external",
      "function hasRole(bytes32 role, address account) view returns (bool)"
    ],
    UTUT,
    signer
  );

  // Check current status
  console.log("\n📋 Current role status:");
  const signerHasAdmin = await uTUT.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  const safeHasAdmin = await uTUT.hasRole(DEFAULT_ADMIN_ROLE, SAFE);
  const trainingHasMinter = await uTUT.hasRole(MINTER_ROLE, TRAINING_REWARDS);
  
  console.log(`   Signer has DEFAULT_ADMIN: ${signerHasAdmin ? '✅' : '❌'}`);
  console.log(`   Safe has DEFAULT_ADMIN: ${safeHasAdmin ? '✅' : '❌'}`);
  console.log(`   TrainingRewards has MINTER: ${trainingHasMinter ? '✅' : '❌'}`);

  if (!signerHasAdmin) {
    console.log("\n❌ ERROR: Signer doesn't have DEFAULT_ADMIN_ROLE");
    console.log("   Cannot grant roles without admin access");
    process.exit(1);
  }

  // Grant DEFAULT_ADMIN_ROLE to Safe (so Safe can manage roles in future)
  if (!safeHasAdmin) {
    console.log("\n1️⃣  Granting DEFAULT_ADMIN_ROLE to Safe...");
    const tx1 = await uTUT.grantRole(DEFAULT_ADMIN_ROLE, SAFE);
    console.log(`   TX: ${tx1.hash}`);
    await tx1.wait();
    console.log("   ✅ Done!");
  } else {
    console.log("\n1️⃣  Safe already has DEFAULT_ADMIN_ROLE ✅");
  }

  // Grant MINTER_ROLE to TrainingRewards
  if (!trainingHasMinter) {
    console.log("\n2️⃣  Granting MINTER_ROLE to TrainingRewards...");
    const tx2 = await uTUT.grantRole(MINTER_ROLE, TRAINING_REWARDS);
    console.log(`   TX: ${tx2.hash}`);
    await tx2.wait();
    console.log("   ✅ Done!");
  } else {
    console.log("\n2️⃣  TrainingRewards already has MINTER_ROLE ✅");
  }

  // Verify
  console.log("\n📋 Final role status:");
  console.log(`   Safe has DEFAULT_ADMIN: ${await uTUT.hasRole(DEFAULT_ADMIN_ROLE, SAFE) ? '✅' : '❌'}`);
  console.log(`   TrainingRewards has MINTER: ${await uTUT.hasRole(MINTER_ROLE, TRAINING_REWARDS) ? '✅' : '❌'}`);

  console.log("\n✅ uTUT roles configured!");
  console.log("\n📋 NEXT STEPS:");
  console.log("   Now execute the Safe batch (transactions 2-5 only):");
  console.log("   - Grant REWARDER_ROLE to relayer");
  console.log("   - Create 3 IBM SkillsBuild campaigns");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
