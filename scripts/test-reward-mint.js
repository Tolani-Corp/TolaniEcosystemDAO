/**
 * Test reward mint - simulate IBM SkillsBuild completion
 * 
 * Run: npx hardhat run scripts/test-reward-mint.js --network base
 */

const { ethers } = require("hardhat");

const TRAINING_REWARDS = "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526";
const UTUT = "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4";
const RELAYER_ADDRESS = "0x3203009FC71927c8484645B3dF17863d1eF3A21a";

// Test learner - use Safe owner for testing
const TEST_LEARNER = "0xA484fC94908c821A18d60312F620B135D1b55235";

// General Courses campaign
const CAMPAIGN_ID = "0x7d5cdddb86bdc460f01c202fe957700c31670ac987c0da99963486c0162644eb";

async function main() {
  // Get all signers and find the relayer
  const signers = await ethers.getSigners();
  let signer = signers[0];
  
  // Find the relayer signer
  for (const s of signers) {
    if (s.address.toLowerCase() === RELAYER_ADDRESS.toLowerCase()) {
      signer = s;
      break;
    }
  }
  
  console.log("🔑 Using wallet:", signer.address);
  
  if (signer.address.toLowerCase() !== RELAYER_ADDRESS.toLowerCase()) {
    console.log("⚠️  Warning: Relayer wallet not found in signers. Using:", signer.address);
  }

  const training = await ethers.getContractAt(
    [
      "function grantReward(address learner, bytes32 campaignId, bytes32 completionProof) external",
      "function hasRole(bytes32 role, address account) view returns (bool)"
    ],
    TRAINING_REWARDS,
    signer
  );

  const uTUT = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    UTUT
  );

  // Check relayer has REWARDER_ROLE
  const REWARDER_ROLE = "0xbeec13769b5f410b0584f69811bfd923818456d5edcf426b0e31cf90eed7a3f6";
  const hasRole = await training.hasRole(REWARDER_ROLE, signer.address);
  console.log(`\n📋 Relayer has REWARDER_ROLE: ${hasRole ? '✅' : '❌'}`);
  
  if (!hasRole) {
    console.log("❌ Cannot proceed - relayer needs REWARDER_ROLE");
    process.exit(1);
  }

  // Get learner's current balance
  const balanceBefore = await uTUT.balanceOf(TEST_LEARNER);
  console.log(`\n📊 Learner ${TEST_LEARNER.slice(0,10)}... balance before: ${balanceBefore} uTUT`);

  // Mark completion
  console.log("\n🎓 Marking course completion...");
  console.log(`   Learner: ${TEST_LEARNER}`);
  console.log(`   Campaign: General Courses (50 uTUT)`);
  
  // Generate a completion proof (hash of learner + campaign + timestamp)
  const completionProof = ethers.keccak256(
    ethers.solidityPacked(
      ["address", "bytes32", "uint256"],
      [TEST_LEARNER, CAMPAIGN_ID, Math.floor(Date.now() / 1000)]
    )
  );
  console.log(`   Proof: ${completionProof.slice(0, 18)}...`);
  
  try {
    const tx = await training.grantReward(TEST_LEARNER, CAMPAIGN_ID, completionProof);
    console.log(`   TX: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    
    // Check new balance
    const balanceAfter = await uTUT.balanceOf(TEST_LEARNER);
    console.log(`\n📊 Learner balance after: ${balanceAfter} uTUT`);
    console.log(`   Reward received: ${balanceAfter - balanceBefore} uTUT`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 TEST SUCCESSFUL! Reward system is working!");
    console.log("=".repeat(50));
    
  } catch (error) {
    console.log("\n❌ Transaction failed:");
    console.log(error.message);
    
    if (error.message.includes("AlreadyCompleted")) {
      console.log("\n💡 This learner already completed this campaign.");
      console.log("   Try with a different learner address.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
