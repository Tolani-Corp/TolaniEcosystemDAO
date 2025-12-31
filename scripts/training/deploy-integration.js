/**
 * Deploy IBM SkillsBuild Integration Contracts
 * Tolani Labs + Tolani Ecosystem DAO
 * 
 * Deployment Order:
 * 1. uTUT - Micro utility token
 * 2. TUTConverter - TUT ↔ uTUT conversion
 * 3. SessionKeyRegistry - Session management
 * 4. GasTreasuryModule - Gas reimbursements
 * 5. TrainingRewards - Reward distribution
 * 6. SessionInvoker - Action orchestration
 * 
 * Usage:
 *   npx hardhat run scripts/training/deploy-integration.js --network sepolia
 *   npx hardhat run scripts/training/deploy-integration.js --network baseSepolia
 */

const { ethers, network } = require("hardhat");
const { UTUT_CONFIG, TRAINING_CAMPAIGNS, GAS_TREASURY_CONFIG } = require("./config");

// NOTE: Using direct deployment (non-proxy) for testnet
// For production with upgradeability, install @openzeppelin/hardhat-upgrades

// Contract addresses storage
const deployedContracts = {
  uTUT: null,
  TUTConverter: null,
  SessionKeyRegistry: null,
  GasTreasuryModule: null,
  TrainingRewards: null,
  SessionInvoker: null,
};

// Existing TUT token address (update per network)
const TUT_ADDRESSES = {
  sepolia: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  baseSepolia: null,  // Bridge or deploy
  base: null,  // Mainnet
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("IBM SKILLSBUILD INTEGRATION DEPLOYMENT");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`\n📡 Network:  ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH\n`);
  
  // ============================================================
  // 1. Deploy uTUT Token (Direct deployment for testnet)
  // ============================================================
  console.log("1️⃣  Deploying uTUT Token...");
  
  const uTUT = await ethers.getContractFactory("uTUT");
  const ututContract = await uTUT.deploy();
  await ututContract.waitForDeployment();
  deployedContracts.uTUT = await ututContract.getAddress();
  console.log(`   Contract deployed: ${deployedContracts.uTUT}`);
  
  // Initialize
  const ututInitTx = await ututContract.initialize(
    deployer.address,  // owner
    UTUT_CONFIG.bootstrapCap  // initial cap
  );
  await ututInitTx.wait();
  console.log(`   ✅ uTUT initialized`);
  
  // ============================================================
  // 2. Deploy TUTConverter
  // ============================================================
  console.log("\n2️⃣  Deploying TUTConverter...");
  
  const tutAddress = TUT_ADDRESSES[networkName];
  if (!tutAddress) {
    console.log("   ⚠️  No TUT address for this network - skipping converter");
  } else {
    const TUTConverter = await ethers.getContractFactory("TUTConverter");
    const converterContract = await TUTConverter.deploy();
    await converterContract.waitForDeployment();
    deployedContracts.TUTConverter = await converterContract.getAddress();
    console.log(`   Contract deployed: ${deployedContracts.TUTConverter}`);
    
    // Initialize
    const converterInitTx = await converterContract.initialize(
      deployer.address,  // owner
      tutAddress,        // TUT token
      deployedContracts.uTUT  // uTUT token
    );
    await converterInitTx.wait();
    console.log(`   ✅ TUTConverter initialized`);
    
    // Set converter on uTUT
    const setConverterTx = await ututContract.setConverter(deployedContracts.TUTConverter);
    await setConverterTx.wait();
    console.log("   ✅ Converter set on uTUT");
  }
  
  // ============================================================
  // 3. Deploy SessionKeyRegistry
  // ============================================================
  console.log("\n3️⃣  Deploying SessionKeyRegistry...");
  
  const SessionKeyRegistry = await ethers.getContractFactory("SessionKeyRegistry");
  const registryContract = await SessionKeyRegistry.deploy();
  await registryContract.waitForDeployment();
  deployedContracts.SessionKeyRegistry = await registryContract.getAddress();
  console.log(`   Contract deployed: ${deployedContracts.SessionKeyRegistry}`);
  
  // Initialize
  const registryInitTx = await registryContract.initialize(deployer.address);
  await registryInitTx.wait();
  console.log(`   ✅ SessionKeyRegistry initialized`);
  
  // ============================================================
  // 4. Deploy GasTreasuryModule
  // ============================================================
  console.log("\n4️⃣  Deploying GasTreasuryModule...");
  
  const GasTreasuryModule = await ethers.getContractFactory("GasTreasuryModule");
  const treasuryContract = await GasTreasuryModule.deploy();
  await treasuryContract.waitForDeployment();
  deployedContracts.GasTreasuryModule = await treasuryContract.getAddress();
  console.log(`   Contract deployed: ${deployedContracts.GasTreasuryModule}`);
  
  // Initialize
  const treasuryInitTx = await treasuryContract.initialize(deployer.address);
  await treasuryInitTx.wait();
  console.log(`   ✅ GasTreasuryModule initialized`);
  
  // Configure gas limits
  const limitsUpdateTx = await treasuryContract.updateLimits(
    GAS_TREASURY_CONFIG.maxPerTransaction,
    GAS_TREASURY_CONFIG.maxDailyPerRelayer,
    GAS_TREASURY_CONFIG.maxDailyGlobal
  );
  await limitsUpdateTx.wait();
  console.log("   ✅ Gas limits configured");
  
  // ============================================================
  // 5. Deploy TrainingRewards
  // ============================================================
  console.log("\n5️⃣  Deploying TrainingRewards...");
  
  const TrainingRewards = await ethers.getContractFactory("TrainingRewards");
  const rewardsContract = await TrainingRewards.deploy();
  await rewardsContract.waitForDeployment();
  deployedContracts.TrainingRewards = await rewardsContract.getAddress();
  console.log(`   Contract deployed: ${deployedContracts.TrainingRewards}`);
  
  // Initialize
  const rewardsInitTx = await rewardsContract.initialize(
    deployer.address,
    deployedContracts.uTUT,
    deployedContracts.SessionKeyRegistry
  );
  await rewardsInitTx.wait();
  console.log(`   ✅ TrainingRewards initialized`);
  
  // Grant MINTER_ROLE to TrainingRewards on uTUT
  const MINTER_ROLE = await ututContract.MINTER_ROLE();
  const grantMinterTx = await ututContract.grantRole(MINTER_ROLE, deployedContracts.TrainingRewards);
  await grantMinterTx.wait();
  console.log("   ✅ MINTER_ROLE granted to TrainingRewards");
  
  // ============================================================
  // 6. Deploy SessionInvoker
  // ============================================================
  console.log("\n6️⃣  Deploying SessionInvoker...");
  
  const SessionInvoker = await ethers.getContractFactory("SessionInvoker");
  const invokerContract = await SessionInvoker.deploy();
  await invokerContract.waitForDeployment();
  deployedContracts.SessionInvoker = await invokerContract.getAddress();
  console.log(`   Contract deployed: ${deployedContracts.SessionInvoker}`);
  
  // Initialize
  const invokerInitTx = await invokerContract.initialize(
    deployer.address,
    deployedContracts.SessionKeyRegistry,
    deployedContracts.TrainingRewards,
    deployedContracts.GasTreasuryModule
  );
  await invokerInitTx.wait();
  console.log(`   ✅ SessionInvoker initialized`);
  
  // Configure roles
  const INVOKER_ROLE = await registryContract.INVOKER_ROLE();
  const grantInvokerTx = await registryContract.grantRole(INVOKER_ROLE, deployedContracts.SessionInvoker);
  await grantInvokerTx.wait();
  console.log("   ✅ INVOKER_ROLE granted to SessionInvoker on Registry");
  
  const REWARDER_ROLE = await rewardsContract.REWARDER_ROLE();
  const grantRewarderTx = await rewardsContract.grantRole(REWARDER_ROLE, deployedContracts.SessionInvoker);
  await grantRewarderTx.wait();
  console.log("   ✅ REWARDER_ROLE granted to SessionInvoker on Rewards");
  
  // ============================================================
  // 7. Create Initial Training Campaigns
  // ============================================================
  console.log("\n7️⃣  Creating Initial Training Campaigns...");
  
  // Only create Phase 1 campaigns
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
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract Addresses:");
  Object.entries(deployedContracts).forEach(([name, address]) => {
    if (address) {
      console.log(`   ${name.padEnd(20)} ${address}`);
    }
  });
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on block explorer");
  console.log("   2. Configure relayer with RELAYER_ROLE on GasTreasury");
  console.log("   3. Fund GasTreasuryModule with ETH");
  console.log("   4. Set up backend verification pipeline");
  console.log("   5. Test full Learn → Earn flow");
  
  // Save addresses to file
  const fs = require("fs");
  const outputPath = `./deployments/${networkName}-training-${Date.now()}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
    tutAddress: TUT_ADDRESSES[networkName],
  }, null, 2));
  console.log(`\n💾 Addresses saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
