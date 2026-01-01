/**
 * Test Learn-to-Earn Flow on Base L2
 * 
 * Tests the complete IBM SkillsBuild training reward flow:
 * 1. Open a session for a test user
 * 2. Complete a training campaign
 * 3. Verify uTUT reward is minted
 * 
 * Usage:
 *   npx hardhat run scripts/training/test-learn-earn-base.js --network baseSepolia
 */

const { ethers } = require("hardhat");

// Base Sepolia contract addresses
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  SessionKeyRegistry: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
  GasTreasuryModule: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
  TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
  SessionInvoker: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867"
};

// Campaign IDs (keccak256 hashes)
const CAMPAIGNS = {
  CONSTRUCTION: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V1")),
  AI_CLOUD: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V1")),
  ESG: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V1"))
};

async function main() {
  const [admin] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("TEST LEARN-TO-EARN FLOW ON BASE L2");
  console.log("=".repeat(60));
  console.log(`Network: Base Sepolia (84532)`);
  console.log(`Admin: ${admin.address}`);
  console.log("");

  // Load contracts
  const uTUT = await ethers.getContractAt("uTUTSimple", CONTRACTS.uTUT);
  const registry = await ethers.getContractAt("SessionKeyRegistrySimple", CONTRACTS.SessionKeyRegistry);
  const rewards = await ethers.getContractAt("TrainingRewardsSimple", CONTRACTS.TrainingRewards);
  const invoker = await ethers.getContractAt("SessionInvokerSimple", CONTRACTS.SessionInvoker);

  // Test user (using admin for simplicity)
  const testUser = admin.address;
  
  console.log("📋 Contract Addresses:");
  console.log(`   uTUT:             ${CONTRACTS.uTUT}`);
  console.log(`   SessionRegistry:  ${CONTRACTS.SessionKeyRegistry}`);
  console.log(`   TrainingRewards:  ${CONTRACTS.TrainingRewards}`);
  console.log(`   SessionInvoker:   ${CONTRACTS.SessionInvoker}`);
  console.log("");

  // Check initial balance
  const initialBalance = await uTUT.balanceOf(testUser);
  console.log(`👤 Test User: ${testUser}`);
  console.log(`   Initial uTUT Balance: ${ethers.formatUnits(initialBalance, 6)} uTUT`);
  console.log("");

  // Step 1: Open a session (need OPERATOR_ROLE or use admin directly)
  console.log("1️⃣  Opening session...");
  try {
    // Check if admin has OPERATOR_ROLE
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    const hasOperator = await registry.hasRole(OPERATOR_ROLE, admin.address);
    
    if (!hasOperator) {
      console.log("   ⚠️  Admin doesn't have OPERATOR_ROLE, granting...");
      const grantTx = await registry.grantRole(OPERATOR_ROLE, admin.address);
      await grantTx.wait();
      console.log("   ✅ OPERATOR_ROLE granted");
    }
    
    // SessionTag enum: TRAINING = 0
    const sessionTx = await registry.openSession(
      testUser,  // sessionKey
      0,         // SessionTag.TRAINING
      86400,     // duration (24 hours)
      100        // maxActions
    );
    await sessionTx.wait();
    console.log(`   ✅ Session opened: ${sessionTx.hash}`);
  } catch (e) {
    if (e.message.includes("already has active session") || e.message.includes("Session already active")) {
      console.log("   ⚠️  Session already active");
    } else {
      console.log(`   ❌ Session error: ${e.reason || e.message}`);
    }
  }

  // Step 2: Complete Construction Training
  console.log("\n2️⃣  Completing CONSTRUCTION training...");
  try {
    // Admin needs RELAYER_ROLE on SessionInvoker
    const RELAYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE"));
    const hasRelayer = await invoker.hasRole(RELAYER_ROLE, admin.address);
    
    if (!hasRelayer) {
      console.log("   ⚠️  Admin doesn't have RELAYER_ROLE, granting...");
      const grantTx = await invoker.grantRole(RELAYER_ROLE, admin.address);
      await grantTx.wait();
      console.log("   ✅ RELAYER_ROLE granted");
    }
    
    const completionId = ethers.keccak256(ethers.toUtf8Bytes(`CONSTRUCTION_${Date.now()}`));
    const tx = await invoker.invokeTrainingReward(
      testUser,              // sessionKey
      testUser,              // learner
      CAMPAIGNS.CONSTRUCTION,
      completionId
    );
    await tx.wait();
    console.log(`   ✅ Construction training completed: ${tx.hash}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.reason || e.message}`);
  }

  // Step 3: Complete AI Cloud Training
  console.log("\n3️⃣  Completing AI_CLOUD training...");
  try {
    const completionId = ethers.keccak256(ethers.toUtf8Bytes(`AI_CLOUD_${Date.now()}`));
    const tx = await invoker.invokeTrainingReward(
      testUser,
      testUser,
      CAMPAIGNS.AI_CLOUD,
      completionId
    );
    await tx.wait();
    console.log(`   ✅ AI Cloud training completed: ${tx.hash}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.reason || e.message}`);
  }

  // Step 4: Complete ESG Training
  console.log("\n4️⃣  Completing ESG training...");
  try {
    const completionId = ethers.keccak256(ethers.toUtf8Bytes(`ESG_${Date.now()}`));
    const tx = await invoker.invokeTrainingReward(
      testUser,
      testUser,
      CAMPAIGNS.ESG,
      completionId
    );
    await tx.wait();
    console.log(`   ✅ ESG training completed: ${tx.hash}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.reason || e.message}`);
  }

  // Final balance check
  console.log("\n" + "=".repeat(60));
  const finalBalance = await uTUT.balanceOf(testUser);
  const earned = finalBalance - initialBalance;
  
  console.log("📊 RESULTS:");
  console.log(`   Initial Balance: ${ethers.formatUnits(initialBalance, 6)} uTUT`);
  console.log(`   Final Balance:   ${ethers.formatUnits(finalBalance, 6)} uTUT`);
  console.log(`   Earned:          ${ethers.formatUnits(earned, 6)} uTUT`);
  console.log("");
  
  if (earned > 0n) {
    console.log("✅ LEARN-TO-EARN FLOW WORKING ON BASE L2!");
    console.log("");
    console.log("   Expected rewards:");
    console.log("   - Construction: 2,000 uTUT");
    console.log("   - AI Cloud:     4,000 uTUT");
    console.log("   - ESG:          1,500 uTUT");
    console.log("   - Total:        7,500 uTUT");
  } else {
    console.log("⚠️  No rewards earned - check campaign configuration");
  }
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
