/**
 * Deploy Payment Rails Contracts to Base Sepolia
 * 
 * Deploys:
 * 1. MerchantRegistry - Merchant management
 * 2. TolaniPaymentProcessor - Payment processing with gasless support
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Existing Base Sepolia contracts
const EXISTING_CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  MockBridgedTUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
  Treasury: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7", // Use as fee collector
};

async function main() {
  console.log("\n🏦 DEPLOYING PAYMENT RAILS TO BASE SEPOLIA\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`⛽ Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Insufficient ETH for deployment");
    return;
  }

  const deployedContracts = {};

  // ========== 1. Deploy MerchantRegistry ==========
  console.log("1️⃣  Deploying MerchantRegistry...");
  
  const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
  const merchantRegistry = await MerchantRegistry.deploy(deployer.address);
  await merchantRegistry.waitForDeployment();
  
  deployedContracts.MerchantRegistry = await merchantRegistry.getAddress();
  console.log(`   ✅ MerchantRegistry: ${deployedContracts.MerchantRegistry}`);

  // ========== 2. Deploy TolaniPaymentProcessor ==========
  console.log("\n2️⃣  Deploying TolaniPaymentProcessor...");
  
  const PaymentProcessor = await ethers.getContractFactory("TolaniPaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    EXISTING_CONTRACTS.uTUT,
    EXISTING_CONTRACTS.MockBridgedTUT,
    deployedContracts.MerchantRegistry,
    EXISTING_CONTRACTS.Treasury,  // Fee collector
    deployer.address
  );
  await paymentProcessor.waitForDeployment();
  
  deployedContracts.PaymentProcessor = await paymentProcessor.getAddress();
  console.log(`   ✅ PaymentProcessor: ${deployedContracts.PaymentProcessor}`);

  // ========== 3. Setup Roles ==========
  console.log("\n3️⃣  Setting up roles...");
  
  // Grant PaymentProcessor the REGISTRAR_ROLE on MerchantRegistry (to record payments)
  const REGISTRAR_ROLE = await merchantRegistry.REGISTRAR_ROLE();
  await merchantRegistry.grantRole(REGISTRAR_ROLE, deployedContracts.PaymentProcessor);
  console.log(`   ✅ Granted REGISTRAR_ROLE to PaymentProcessor`);

  // ========== 4. Register Test Merchant ==========
  console.log("\n4️⃣  Registering test merchant...");
  
  const testMerchantTx = await merchantRegistry.registerMerchantDirect(
    "Tolani Test Cafe",
    "TEST-001",
    0, // Restaurant category
    deployer.address,  // owner
    deployer.address,  // payout address (same for testing)
    true,  // accepts uTUT
    true,  // accepts TUT
    50,    // 0.5% custom fee
    ""     // no metadata URI
  );
  await testMerchantTx.wait();
  
  // Get merchant ID
  const testMerchantId = await merchantRegistry.getMerchantByOwner(deployer.address);
  console.log(`   ✅ Test Merchant ID: ${testMerchantId}`);
  deployedContracts.TestMerchantId = testMerchantId;

  // ========== Summary ==========
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n   MerchantRegistry:   ${deployedContracts.MerchantRegistry}`);
  console.log(`   PaymentProcessor:   ${deployedContracts.PaymentProcessor}`);
  console.log(`   Test Merchant ID:   ${deployedContracts.TestMerchantId}`);
  console.log(`\n   Existing Contracts:`);
  console.log(`   uTUT:               ${EXISTING_CONTRACTS.uTUT}`);
  console.log(`   TUT (Mock):         ${EXISTING_CONTRACTS.MockBridgedTUT}`);
  console.log(`   Fee Collector:      ${EXISTING_CONTRACTS.Treasury}`);

  // ========== Save Deployment ==========
  const deployment = {
    network: "baseSepolia",
    chainId: 84532,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MerchantRegistry: deployedContracts.MerchantRegistry,
      PaymentProcessor: deployedContracts.PaymentProcessor,
      TestMerchantId: deployedContracts.TestMerchantId,
    },
    existingContracts: EXISTING_CONTRACTS,
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `baseSepolia-payments-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deployment, null, 2)
  );
  console.log(`\n💾 Saved to deployments/${filename}`);

  // ========== Verification Commands ==========
  console.log("\n" + "=".repeat(60));
  console.log("🔍 VERIFICATION COMMANDS");
  console.log("=".repeat(60));
  console.log(`\nnpx hardhat verify --network baseSepolia ${deployedContracts.MerchantRegistry} ${deployer.address}`);
  console.log(`\nnpx hardhat verify --network baseSepolia ${deployedContracts.PaymentProcessor} ${EXISTING_CONTRACTS.uTUT} ${EXISTING_CONTRACTS.MockBridgedTUT} ${deployedContracts.MerchantRegistry} ${EXISTING_CONTRACTS.Treasury} ${deployer.address}`);

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
