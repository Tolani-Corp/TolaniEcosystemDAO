/**
 * Verify all Base Mainnet contracts on Basescan
 * Run: npx hardhat run scripts/verify-base-mainnet.js --network base
 */

const hre = require("hardhat");
const { BASE_MAINNET_ADDRESSES, configuredSafeAddress } = require("./deployments/base-mainnet-addresses");

const SAFE_ADDRESS = configuredSafeAddress();

// Deployed contract addresses
const CONTRACTS = {
  uTUT: BASE_MAINNET_ADDRESSES.uTut,
  SessionKeyRegistry: BASE_MAINNET_ADDRESSES.sessionKeyRegistry,
  TrainingRewards: BASE_MAINNET_ADDRESSES.trainingRewards,
  Timelock: BASE_MAINNET_ADDRESSES.timelock,
  Governor: BASE_MAINNET_ADDRESSES.governor,
  Treasury: BASE_MAINNET_ADDRESSES.treasury,
  StakingPool: BASE_MAINNET_ADDRESSES.stakingPool,
};

// Constructor arguments for each contract
const CONSTRUCTOR_ARGS = {
  // uTUTSimple(admin)
  uTUT: [SAFE_ADDRESS],
  
  // SessionKeyRegistry() - no args
  SessionKeyRegistry: [],
  
  // TrainingRewardsSimple(uTUT, admin)
  TrainingRewards: [
    BASE_MAINNET_ADDRESSES.uTut,
    SAFE_ADDRESS,
  ],
  
  // TolaniEcosystemTimelock(minDelay, proposers, executors, admin)
  Timelock: [
    172800, // 48 hours
    [], // Proposers added after Governor deployment
    ["0x0000000000000000000000000000000000000000"], // Anyone can execute
    BASE_MAINNET_ADDRESSES.deployer,
  ],
  
  // TolaniEcosystemGovernor(token, timelock)
  Governor: [
    BASE_MAINNET_ADDRESSES.tut,
    BASE_MAINNET_ADDRESSES.timelock,
  ],
  
  // TolaniTreasury(timelock)
  Treasury: [
    BASE_MAINNET_ADDRESSES.timelock,
  ],
  
  // StakingPool(stakingToken, governance)
  StakingPool: [
    BASE_MAINNET_ADDRESSES.tut,
    BASE_MAINNET_ADDRESSES.deployer,
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
