/**
 * Verify all Base Mainnet contracts on Basescan
 * Run: npx hardhat run scripts/verify-base-mainnet.js --network base
 */

const hre = require("hardhat");

// Deployed contract addresses
const CONTRACTS = {
  uTUT: "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4",
  SessionKeyRegistry: "0x73e8fDfE1EEd5f6fbE47Ef9bCEaD76da78516025",
  TrainingRewards: "0x1fec9c4dB67b6d3531171936C13760E2a61415D7",
  Timelock: "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d",
  Governor: "0xeEd65936FaEDb315c598F8b1aF796289BCE2B7f6",
  Treasury: "0x3FaB09377944144eB991DB2a5ADf2C96A5e8587c",
  StakingPool: "0x21Fc5CD8606e19961F38E26fd7286f7e647eFf04",
};

// Constructor arguments for each contract
const CONSTRUCTOR_ARGS = {
  // uTUTSimple(admin)
  uTUT: ["0xa56eb5E3990C740C8c58F02eAD263feF02567677"], // Gnosis Safe
  
  // SessionKeyRegistry() - no args
  SessionKeyRegistry: [],
  
  // TrainingRewardsSimple(uTUT, admin)
  TrainingRewards: [
    "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4", // uTUT
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677", // Gnosis Safe
  ],
  
  // TolaniEcosystemTimelock(minDelay, proposers, executors, admin)
  Timelock: [
    86400, // 24 hours
    [], // Proposers added after Governor deployment
    ["0x0000000000000000000000000000000000000000"], // Anyone can execute
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677", // Gnosis Safe
  ],
  
  // TolaniEcosystemGovernor(token, timelock)
  Governor: [
    "0xAf7e938741a720508897Bf3a13538f6713A337A4", // TUT
    "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d", // Timelock
  ],
  
  // TolaniTreasury(timelock)
  Treasury: [
    "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d", // Timelock
  ],
  
  // StakingPool(stakingToken, rewardToken, admin)
  StakingPool: [
    "0xAf7e938741a720508897Bf3a13538f6713A337A4", // TUT (stake)
    "0xAf7e938741a720508897Bf3a13538f6713A337A4", // TUT (reward)
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677", // Gnosis Safe
  ],
};

async function verifyContract(name, address, constructorArgs) {
  console.log(`\n📋 Verifying ${name} at ${address}...`);
  
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ ${name} verified successfully!`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${name} is already verified!`);
      return true;
    }
    console.error(`❌ ${name} verification failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🔍 Starting Base Mainnet Contract Verification");
  console.log("=".repeat(50));
  
  const results = {
    success: [],
    failed: [],
    skipped: [],
  };
  
  // Note: TUT Token is OptimismMintableERC20 deployed by Base Bridge
  // It's automatically verified by Base/Optimism
  console.log("\n⏭️  Skipping TUT Token (deployed by Base Bridge - auto-verified)");
  results.skipped.push("TUT");
  
  // Note: TUTConverter is a UUPS Proxy - verify implementation separately
  console.log("⏭️  Skipping TUTConverter (UUPS Proxy - verify implementation via Basescan UI)");
  results.skipped.push("TUTConverter");
  
  // Verify each contract
  for (const [name, address] of Object.entries(CONTRACTS)) {
    const args = CONSTRUCTOR_ARGS[name] || [];
    const success = await verifyContract(name, address, args);
    
    if (success) {
      results.success.push(name);
    } else {
      results.failed.push(name);
    }
    
    // Rate limit: wait between verifications
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Verified: ${results.success.join(", ") || "None"}`);
  console.log(`❌ Failed: ${results.failed.join(", ") || "None"}`);
  console.log(`⏭️  Skipped: ${results.skipped.join(", ") || "None"}`);
  
  // Print Basescan links
  console.log("\n📎 Basescan Links:");
  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`   ${name}: https://basescan.org/address/${address}#code`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
