/**
 * Deploy IBM SkillsBuild Integration - Upgradeable Contracts
 * Tolani Labs + Tolani Ecosystem DAO
 * 
 * Production deployment for Base L2 (mainnet or testnet)
 * Using OpenZeppelin UUPS upgradeable pattern
 * 
 * Usage:
 *   npx hardhat run scripts/training/deploy-upgradeable.js --network baseSepolia
 *   npx hardhat run scripts/training/deploy-upgradeable.js --network base
 */

const { ethers, upgrades, network } = require("hardhat");
const { UTUT_CONFIG, TRAINING_CAMPAIGNS, GAS_TREASURY_CONFIG } = require("./config");

// Contract addresses storage
const deployedContracts = {
  uTUT: null,
  uTUTImpl: null,
  TUTConverter: null,
  TUTConverterImpl: null,
  SessionKeyRegistry: null,
  SessionKeyRegistryImpl: null,
  GasTreasuryModule: null,
  GasTreasuryModuleImpl: null,
  TrainingRewards: null,
  TrainingRewardsImpl: null,
  SessionInvoker: null,
  SessionInvokerImpl: null,
};

// TUT Token addresses by network
const TUT_ADDRESSES = {
  sepolia: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  baseSepolia: null, // Will deploy new TUT on Base testnet if needed
  base: null, // Production TUT address TBD
};

// Trusted Forwarder (ERC2771 meta-transactions)
const TRUSTED_FORWARDERS = {
  baseSepolia: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c", // GSN Forwarder
  base: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c", // GSN Forwarder
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("IBM SKILLSBUILD INTEGRATION - UPGRADEABLE CONTRACTS");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log(`\n📡 Network:  ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH\n`);
  
  const trustedForwarder = TRUSTED_FORWARDERS[networkName] || ethers.ZeroAddress;
  console.log(`🔐 Forwarder: ${trustedForwarder}\n`);
  
  // ============================================================
  // 1. Deploy uTUT Token (Upgradeable)
  // ============================================================
  console.log("1️⃣  Deploying uTUT Token (Upgradeable Proxy)...");
  
  const uTUT = await ethers.getContractFactory("uTUT");
  const ututProxy = await upgrades.deployProxy(uTUT, [
    deployer.address,    // owner
    UTUT_CONFIG.bootstrapCap,  // initial cap
    trustedForwarder     // ERC2771 forwarder
  ], { 
    kind: 'uups',
    initializer: 'initialize'
  });
  await ututProxy.waitForDeployment();
  
  deployedContracts.uTUT = await ututProxy.getAddress();
  deployedContracts.uTUTImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.uTUT);
  
  console.log(`   ✅ uTUT Proxy:  ${deployedContracts.uTUT}`);
  console.log(`   ✅ uTUT Impl:   ${deployedContracts.uTUTImpl}`);
  
  // ============================================================
  // 2. Deploy TUTConverter (Upgradeable)
  // ============================================================
  console.log("\n2️⃣  Deploying TUTConverter (Upgradeable Proxy)...");
  
  const tutAddress = TUT_ADDRESSES[networkName];
  if (!tutAddress) {
    console.log("   ⚠️  No TUT address for this network - skipping converter");
    console.log("   ⚠️  Deploy TUT token first, then redeploy with address");
  } else {
    const TUTConverter = await ethers.getContractFactory("TUTConverter");
    const converterProxy = await upgrades.deployProxy(TUTConverter, [
      deployer.address,
      tutAddress,
      deployedContracts.uTUT,
      trustedForwarder
    ], {
      kind: 'uups',
      initializer: 'initialize'
    });
    await converterProxy.waitForDeployment();
    
    deployedContracts.TUTConverter = await converterProxy.getAddress();
    deployedContracts.TUTConverterImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.TUTConverter);
    
    console.log(`   ✅ TUTConverter Proxy: ${deployedContracts.TUTConverter}`);
    console.log(`   ✅ TUTConverter Impl:  ${deployedContracts.TUTConverterImpl}`);
    
    // Grant MINTER_ROLE to converter on uTUT
    const MINTER_ROLE = await ututProxy.MINTER_ROLE();
    const grantTx1 = await ututProxy.grantRole(MINTER_ROLE, deployedContracts.TUTConverter);
    await grantTx1.wait();
    console.log("   ✅ MINTER_ROLE granted to TUTConverter");
    
    // Set converter on uTUT
    const setConverterTx = await ututProxy.setConverter(deployedContracts.TUTConverter);
    await setConverterTx.wait();
    console.log("   ✅ Converter set on uTUT");
  }
  
  // ============================================================
  // 3. Deploy SessionKeyRegistry (Upgradeable)
  // ============================================================
  console.log("\n3️⃣  Deploying SessionKeyRegistry (Upgradeable Proxy)...");
  
  const SessionKeyRegistry = await ethers.getContractFactory("SessionKeyRegistry");
  const registryProxy = await upgrades.deployProxy(SessionKeyRegistry, [
    deployer.address,
    trustedForwarder
  ], {
    kind: 'uups',
    initializer: 'initialize'
  });
  await registryProxy.waitForDeployment();
  
  deployedContracts.SessionKeyRegistry = await registryProxy.getAddress();
  deployedContracts.SessionKeyRegistryImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.SessionKeyRegistry);
  
  console.log(`   ✅ SessionKeyRegistry Proxy: ${deployedContracts.SessionKeyRegistry}`);
  console.log(`   ✅ SessionKeyRegistry Impl:  ${deployedContracts.SessionKeyRegistryImpl}`);
  
  // ============================================================
  // 4. Deploy GasTreasuryModule (Upgradeable)
  // ============================================================
  console.log("\n4️⃣  Deploying GasTreasuryModule (Upgradeable Proxy)...");
  
  const GasTreasuryModule = await ethers.getContractFactory("GasTreasuryModule");
  const treasuryProxy = await upgrades.deployProxy(GasTreasuryModule, [
    deployer.address,
    trustedForwarder
  ], {
    kind: 'uups',
    initializer: 'initialize'
  });
  await treasuryProxy.waitForDeployment();
  
  deployedContracts.GasTreasuryModule = await treasuryProxy.getAddress();
  deployedContracts.GasTreasuryModuleImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.GasTreasuryModule);
  
  console.log(`   ✅ GasTreasuryModule Proxy: ${deployedContracts.GasTreasuryModule}`);
  console.log(`   ✅ GasTreasuryModule Impl:  ${deployedContracts.GasTreasuryModuleImpl}`);
  
  // Configure gas limits
  const limitsUpdateTx = await treasuryProxy.updateLimits(
    GAS_TREASURY_CONFIG.maxPerTransaction,
    GAS_TREASURY_CONFIG.maxDailyPerRelayer,
    GAS_TREASURY_CONFIG.maxDailyGlobal
  );
  await limitsUpdateTx.wait();
  console.log("   ✅ Gas limits configured");
  
  // ============================================================
  // 5. Deploy TrainingRewards (Upgradeable)
  // ============================================================
  console.log("\n5️⃣  Deploying TrainingRewards (Upgradeable Proxy)...");
  
  const TrainingRewards = await ethers.getContractFactory("TrainingRewardsV2");
  const rewardsProxy = await upgrades.deployProxy(TrainingRewards, [
    deployer.address,
    deployedContracts.uTUT,
    deployedContracts.SessionKeyRegistry,
    trustedForwarder
  ], {
    kind: 'uups',
    initializer: 'initialize'
  });
  await rewardsProxy.waitForDeployment();
  
  deployedContracts.TrainingRewards = await rewardsProxy.getAddress();
  deployedContracts.TrainingRewardsImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.TrainingRewards);
  
  console.log(`   ✅ TrainingRewards Proxy: ${deployedContracts.TrainingRewards}`);
  console.log(`   ✅ TrainingRewards Impl:  ${deployedContracts.TrainingRewardsImpl}`);
  
  // Grant MINTER_ROLE to TrainingRewards on uTUT
  const MINTER_ROLE = await ututProxy.MINTER_ROLE();
  const grantMinterTx = await ututProxy.grantRole(MINTER_ROLE, deployedContracts.TrainingRewards);
  await grantMinterTx.wait();
  console.log("   ✅ MINTER_ROLE granted to TrainingRewards");
  
  // ============================================================
  // 6. Deploy SessionInvoker (Upgradeable)
  // ============================================================
  console.log("\n6️⃣  Deploying SessionInvoker (Upgradeable Proxy)...");
  
  const SessionInvoker = await ethers.getContractFactory("SessionInvoker");
  const invokerProxy = await upgrades.deployProxy(SessionInvoker, [
    deployer.address,
    deployedContracts.SessionKeyRegistry,
    deployedContracts.TrainingRewards,
    deployedContracts.GasTreasuryModule,
    trustedForwarder
  ], {
    kind: 'uups',
    initializer: 'initialize'
  });
  await invokerProxy.waitForDeployment();
  
  deployedContracts.SessionInvoker = await invokerProxy.getAddress();
  deployedContracts.SessionInvokerImpl = await upgrades.erc1967.getImplementationAddress(deployedContracts.SessionInvoker);
  
  console.log(`   ✅ SessionInvoker Proxy: ${deployedContracts.SessionInvoker}`);
  console.log(`   ✅ SessionInvoker Impl:  ${deployedContracts.SessionInvokerImpl}`);
  
  // Grant INVOKER_ROLE to SessionInvoker on Registry
  const INVOKER_ROLE = await registryProxy.INVOKER_ROLE();
  const grantInvokerTx = await registryProxy.grantRole(INVOKER_ROLE, deployedContracts.SessionInvoker);
  await grantInvokerTx.wait();
  console.log("   ✅ INVOKER_ROLE granted to SessionInvoker on Registry");
  
  // Grant REWARDER_ROLE to SessionInvoker on Rewards
  const REWARDER_ROLE = await rewardsProxy.REWARDER_ROLE();
  const grantRewarderTx = await rewardsProxy.grantRole(REWARDER_ROLE, deployedContracts.SessionInvoker);
  await grantRewarderTx.wait();
  console.log("   ✅ REWARDER_ROLE granted to SessionInvoker on Rewards");
  
  // ============================================================
  // 7. Create Initial Training Campaigns
  // ============================================================
  console.log("\n7️⃣  Creating Initial Training Campaigns...");
  
  const phase1Campaigns = Object.entries(TRAINING_CAMPAIGNS)
    .filter(([_, c]) => !c.launchPhase || c.launchPhase === 1);
  
  for (const [key, campaign] of phase1Campaigns) {
    const createTx = await rewardsProxy.createCampaign(
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
  console.log("DEPLOYMENT COMPLETE - UPGRADEABLE CONTRACTS");
  console.log("=".repeat(60));
  
  console.log("\n📋 Proxy Addresses:");
  const proxyContracts = ['uTUT', 'TUTConverter', 'SessionKeyRegistry', 'GasTreasuryModule', 'TrainingRewards', 'SessionInvoker'];
  proxyContracts.forEach(name => {
    if (deployedContracts[name]) {
      console.log(`   ${name.padEnd(20)} ${deployedContracts[name]}`);
    }
  });
  
  console.log("\n📋 Implementation Addresses:");
  proxyContracts.forEach(name => {
    const implKey = `${name}Impl`;
    if (deployedContracts[implKey]) {
      console.log(`   ${name.padEnd(20)} ${deployedContracts[implKey]}`);
    }
  });
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on Basescan");
  console.log("   2. Configure relayer with RELAYER_ROLE on GasTreasury");
  console.log("   3. Fund GasTreasuryModule with ETH");
  console.log("   4. Set up Pimlico/Gelato for gasless transactions");
  console.log("   5. Connect to Tolani Labs backend API");
  
  // Save addresses to file
  const fs = require("fs");
  const outputPath = `./deployments/${networkName}-training-upgradeable-${Date.now()}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
    tutAddress: TUT_ADDRESSES[networkName],
    trustedForwarder: trustedForwarder,
    contractType: "upgradeable (UUPS proxy)",
    campaigns: Object.keys(TRAINING_CAMPAIGNS),
  }, null, 2));
  console.log(`\n💾 Addresses saved to: ${outputPath}`);
  
  console.log("\n📋 Verification Commands:");
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.uTUTImpl}`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.SessionKeyRegistryImpl}`);
  console.log(`   npx hardhat verify --network ${networkName} ${deployedContracts.TrainingRewardsImpl}`);
  // Note: For proxies, use: npx hardhat verify --network <network> <proxy_address>
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
