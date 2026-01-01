/**
 * Deploy IBM SkillsBuild Integration - Base L2 Simple Contracts
 * Tolani Labs + Tolani Ecosystem DAO
 * 
 * Standalone deployment for Base Sepolia/Base Mainnet
 * Does NOT require existing TUT token (converter deployed but inactive)
 * 
 * Usage:
 *   npx hardhat run scripts/training/deploy-base-simple.js --network baseSepolia
 *   npx hardhat run scripts/training/deploy-base-simple.js --network base
 */

const { ethers, network } = require("hardhat");
const { UTUT_CONFIG, TRAINING_CAMPAIGNS, GAS_TREASURY_CONFIG } = require("./config");

// Contract addresses storage
const deployedContracts = {
  uTUT: null,
  TUTConverter: null,
  SessionKeyRegistry: null,
  GasTreasuryModule: null,
  TrainingRewards: null,
  SessionInvoker: null,
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("IBM SKILLSBUILD - BASE L2 SIMPLE CONTRACTS");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`\n📡 Network:  ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH\n`);
  
  if (balance === 0n) {
    console.log("❌ No ETH balance! Get testnet ETH from:");
    console.log("   https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }
  
  // ============================================================
  // 1. Deploy uTUTSimple Token
  // ============================================================
  console.log("1️⃣  Deploying uTUTSimple Token...");
  
  const uTUT = await ethers.getContractFactory("uTUTSimple");
  const ututContract = await uTUT.deploy(
    deployer.address,  // owner
    UTUT_CONFIG.bootstrapCap  // initial cap
  );
  await ututContract.waitForDeployment();
  deployedContracts.uTUT = await ututContract.getAddress();
  console.log(`   ✅ uTUTSimple deployed: ${deployedContracts.uTUT}`);
  
  // ============================================================
  // 2. Deploy SessionKeyRegistrySimple
  // ============================================================
  console.log("\n2️⃣  Deploying SessionKeyRegistrySimple...");
  
  const SessionKeyRegistry = await ethers.getContractFactory("SessionKeyRegistrySimple");
  const registryContract = await SessionKeyRegistry.deploy(deployer.address);
  await registryContract.waitForDeployment();
  deployedContracts.SessionKeyRegistry = await registryContract.getAddress();
  console.log(`   ✅ SessionKeyRegistrySimple deployed: ${deployedContracts.SessionKeyRegistry}`);
  
  // ============================================================
  // 3. Deploy GasTreasuryModuleSimple
  // ============================================================
  console.log("\n3️⃣  Deploying GasTreasuryModuleSimple...");
  
  const GasTreasuryModule = await ethers.getContractFactory("GasTreasuryModuleSimple");
  const treasuryContract = await GasTreasuryModule.deploy(deployer.address);
  await treasuryContract.waitForDeployment();
  deployedContracts.GasTreasuryModule = await treasuryContract.getAddress();
  console.log(`   ✅ GasTreasuryModuleSimple deployed: ${deployedContracts.GasTreasuryModule}`);
  
  // Configure gas limits
  const limitsUpdateTx = await treasuryContract.updateLimits(
    GAS_TREASURY_CONFIG.maxPerTransaction,
    GAS_TREASURY_CONFIG.maxDailyPerRelayer,
    GAS_TREASURY_CONFIG.maxDailyGlobal
  );
  await limitsUpdateTx.wait();
  console.log("   ✅ Gas limits configured");
  
  // ============================================================
  // 4. Deploy TrainingRewardsSimple
  // ============================================================
  console.log("\n4️⃣  Deploying TrainingRewardsSimple...");
  
  const TrainingRewards = await ethers.getContractFactory("TrainingRewardsSimple");
  const rewardsContract = await TrainingRewards.deploy(
    deployer.address,
    deployedContracts.uTUT,
    deployedContracts.SessionKeyRegistry
  );
  await rewardsContract.waitForDeployment();
  deployedContracts.TrainingRewards = await rewardsContract.getAddress();
  console.log(`   ✅ TrainingRewardsSimple deployed: ${deployedContracts.TrainingRewards}`);
  
  // Grant MINTER_ROLE to TrainingRewards on uTUT
  const MINTER_ROLE = await ututContract.MINTER_ROLE();
  const grantMinterTx = await ututContract.grantRole(MINTER_ROLE, deployedContracts.TrainingRewards);
  await grantMinterTx.wait();
  console.log("   ✅ MINTER_ROLE granted to TrainingRewards");
  
  // ============================================================
  // 5. Deploy SessionInvokerSimple
  // ============================================================
  console.log("\n5️⃣  Deploying SessionInvokerSimple...");
  
  const SessionInvoker = await ethers.getContractFactory("SessionInvokerSimple");
  const invokerContract = await SessionInvoker.deploy(
    deployer.address,
    deployedContracts.SessionKeyRegistry,
    deployedContracts.TrainingRewards,
    deployedContracts.GasTreasuryModule
  );
  await invokerContract.waitForDeployment();
  deployedContracts.SessionInvoker = await invokerContract.getAddress();
  console.log(`   ✅ SessionInvokerSimple deployed: ${deployedContracts.SessionInvoker}`);
  
  // Grant INVOKER_ROLE to SessionInvoker on Registry
  const INVOKER_ROLE = await registryContract.INVOKER_ROLE();
  const grantInvokerTx = await registryContract.grantRole(INVOKER_ROLE, deployedContracts.SessionInvoker);
  await grantInvokerTx.wait();
  console.log("   ✅ INVOKER_ROLE granted to SessionInvoker on Registry");
  
  // Grant REWARDER_ROLE to SessionInvoker on Rewards
  const REWARDER_ROLE = await rewardsContract.REWARDER_ROLE();
  const grantRewarderTx = await rewardsContract.grantRole(REWARDER_ROLE, deployedContracts.SessionInvoker);
  await grantRewarderTx.wait();
  console.log("   ✅ REWARDER_ROLE granted to SessionInvoker on Rewards");
  
  // ============================================================
  // 6. Create Initial Training Campaigns
  // ============================================================
  console.log("\n6️⃣  Creating Initial Training Campaigns...");
  
  const phase1Campaigns = Object.entries(TRAINING_CAMPAIGNS)
    .filter(([_, c]) => !c.launchPhase || c.launchPhase === 1);
  
  for (const [key, campaign] of phase1Campaigns) {
    const createTx = await rewardsContract.createCampaign(
      campaign.id,
      campaign.name,
      campaign.rewardPerCompletion,
      campaign.budget,
      0,  // Start immediately
      0   // No end time
    );
    await createTx.wait();
    console.log(`   ✅ Created campaign: ${campaign.name}`);
  }
  
  // ============================================================
  // Summary
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE - BASE L2");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract Addresses:");
  Object.entries(deployedContracts).forEach(([name, address]) => {
    if (address) {
      console.log(`   ${name.padEnd(20)} ${address}`);
    }
  });
  
  const explorerUrl = networkName === "base" 
    ? "https://basescan.org" 
    : "https://sepolia.basescan.org";
  
  console.log(`\n🔗 Explorer: ${explorerUrl}`);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on Basescan");
  console.log("   2. Configure relayer with RELAYER_ROLE on GasTreasury");
  console.log("   3. Fund GasTreasuryModule with ETH");
  console.log("   4. Deploy TUTConverterSimple when TUT is bridged");
  console.log("   5. Run test-learn-earn-base.js to validate flow");
  
  // Save addresses to file
  const fs = require("fs");
  const outputPath = `./deployments/${networkName}-training-simple-${Date.now()}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    network: networkName,
    chainId: network.config.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
    contractType: "simple (non-upgradeable)",
    note: "TUTConverter not deployed - deploy separately when TUT is bridged",
  }, null, 2));
  console.log(`\n💾 Addresses saved to: ${outputPath}`);
  
  // Verification commands
  console.log("\n📋 Verification Commands:");
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.uTUT} "${deployer.address}" "${UTUT_CONFIG.bootstrapCap}"`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.SessionKeyRegistry} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.GasTreasuryModule} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.TrainingRewards} "${deployer.address}" "${deployedContracts.uTUT}" "${deployedContracts.SessionKeyRegistry}"`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.SessionInvoker} "${deployer.address}" "${deployedContracts.SessionKeyRegistry}" "${deployedContracts.TrainingRewards}" "${deployedContracts.GasTreasuryModule}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
