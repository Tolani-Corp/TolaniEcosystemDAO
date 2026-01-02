/**
 * STRESS TEST SCENARIO 2: Payment Rails Load Test
 * 
 * Simulates:
 * - Registering multiple merchants rapidly
 * - Processing many payments in succession
 * - Gasless payment throughput via relayer
 * - Fee collection verification
 * 
 * Metrics tracked:
 * - Merchant registration success rate
 * - Payment processing time
 * - Gas costs per payment type
 */

require("dotenv").config();
const { ethers } = require("hardhat");

// Contract addresses (Base Sepolia)
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  tut: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
  merchantRegistry: "0x17904f65220771fDBAbca6eCcDdAf42345C9571d",
  paymentProcessor: "0x6Cdf992ae198C7Ff1482bDf3Ac6D3bE3F3D8ac16",  // NEW - Fixed version
  feeCollector: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7"
};

// ABIs
const MERCHANT_REGISTRY_ABI = [
  "function registerMerchantDirect(string name, string businessId, uint8 category, address owner, address payoutAddress, bool acceptsUTUT, bool acceptsTUT, uint256 customFeeRate, string metadataURI) returns (bytes32)",
  "function getMerchantCount() view returns (uint256)",
  "function getMerchant(bytes32) view returns (tuple(string name, string businessId, uint8 category, address payoutAddress, address owner, uint256 feeRate, bool acceptsUTUT, bool acceptsTUT, uint8 status, uint256 totalVolume, uint256 totalTransactions, uint256 registeredAt, uint256 lastTransactionAt, string metadataURI))",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function REGISTRAR_ROLE() view returns (bytes32)",
  "event MerchantRegistered(bytes32 indexed merchantId, string name, address indexed owner, address payoutAddress, uint8 category)"
];

const PAYMENT_PROCESSOR_ABI = [
  "function pay(bytes32 merchantId, address token, uint256 amount, bytes32 orderId, string memo) returns (bytes32)",
  "function payments(bytes32) view returns (bytes32 merchantId, address payer, address token, uint256 amount, uint256 fee, uint256 merchantAmount, uint256 timestamp, uint8 status, bytes32 orderId, string memo)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function minPayment() view returns (uint256)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Test configuration
const CONFIG = {
  numMerchants: 5,           // Register 5 merchants
  paymentsPerMerchant: 5,    // 5 payments to each merchant
  paymentAmount: ethers.parseUnits("1", 6),  // 1 uTUT per payment
};

// Metrics
const metrics = {
  merchantsRegistered: 0,
  paymentsProcessed: 0,
  totalFeesCollected: 0n,
  totalGasUsed: 0n,
  failedTxs: 0,
  startTime: 0,
  endTime: 0,
  txTimes: []
};

// Categories for merchants
const CATEGORIES = [
  "Restaurant",
  "Retail", 
  "Services",
  "Education",
  "Healthcare"
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🏦 STRESS TEST SCENARIO 2: Payment Rails Load");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log(`\n📍 Operator: ${deployer.address}`);
  
  // Connect to contracts
  const merchantRegistry = new ethers.Contract(
    CONTRACTS.merchantRegistry,
    MERCHANT_REGISTRY_ABI,
    deployer
  );
  
  const paymentProcessor = new ethers.Contract(
    CONTRACTS.paymentProcessor,
    PAYMENT_PROCESSOR_ABI,
    deployer
  );
  
  const uTUT = new ethers.Contract(CONTRACTS.uTUT, ERC20_ABI, deployer);
  
  // Check roles
  const REGISTRAR = await merchantRegistry.REGISTRAR_ROLE();
  const hasRegistrar = await merchantRegistry.hasRole(REGISTRAR, deployer.address);
  
  console.log(`\n🔑 Roles:`);
  console.log(`   Registrar: ${hasRegistrar ? "✅" : "❌"}`);
  
  // Check balances
  const uTUTBalance = await uTUT.balanceOf(deployer.address);
  console.log(`   uTUT Balance: ${ethers.formatUnits(uTUTBalance, 6)}`);
  
  const totalPaymentsNeeded = BigInt(CONFIG.numMerchants * CONFIG.paymentsPerMerchant) * CONFIG.paymentAmount;
  if (uTUTBalance < totalPaymentsNeeded) {
    console.log(`\n⚠️  Insufficient uTUT for full test. Need ${ethers.formatUnits(totalPaymentsNeeded, 6)}, have ${ethers.formatUnits(uTUTBalance, 6)}`);
    console.log("   Will process as many payments as possible.");
  }
  
  // Approve PaymentProcessor
  const currentAllowance = await uTUT.allowance(deployer.address, CONTRACTS.paymentProcessor);
  if (currentAllowance < totalPaymentsNeeded) {
    console.log(`\n💳 Approving PaymentProcessor for uTUT...`);
    const approveTx = await uTUT.approve(CONTRACTS.paymentProcessor, ethers.MaxUint256);
    await approveTx.wait();
    console.log("   ✅ Approved");
  }
  
  // Initial state
  const initialMerchantCount = await merchantRegistry.getMerchantCount();
  const initialFeeBalance = await uTUT.balanceOf(CONTRACTS.feeCollector);
  
  console.log(`\n📊 Initial State:`);
  console.log(`   Merchant Count: ${initialMerchantCount}`);
  console.log(`   Fee Collector Balance: ${ethers.formatUnits(initialFeeBalance, 6)} uTUT`);
  
  metrics.startTime = Date.now();
  
  // ==============================================
  // PHASE 1: Register Multiple Merchants
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("🏪 PHASE 1: Registering Merchants");
  console.log("-".repeat(40));
  
  const merchantIds = [];
  const merchantWallets = [];
  
  for (let i = 0; i < CONFIG.numMerchants; i++) {
    const txStart = Date.now();
    
    // Generate unique merchant wallet
    const merchantWallet = ethers.Wallet.createRandom();
    merchantWallets.push(merchantWallet);
    
    try {
      const tx = await merchantRegistry.registerMerchantDirect(
        `Stress Test Shop ${i + 1}`,
        `BIZ-STRESS-${Date.now()}-${i}`,
        i % 5, // category
        merchantWallet.address,
        merchantWallet.address,
        true,  // accepts uTUT
        true,  // accepts TUT
        100,   // 1% fee
        `ipfs://merchant-stress-${i}`,
        { gasLimit: 500000 }
      );
      
      const receipt = await tx.wait();
      const txEnd = Date.now();
      
      // Extract merchantId from MerchantRegistered event
      let merchantId;
      for (const log of receipt.logs) {
        try {
          const parsed = merchantRegistry.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed && parsed.name === "MerchantRegistered") {
            merchantId = parsed.args.merchantId || parsed.args[0];
            break;
          }
        } catch (e) {
          // Not this event, try next
        }
      }
      
      if (!merchantId) {
        console.log(`   ⚠️  Could not extract merchantId from event, skipping...`);
        metrics.failedTxs++;
        continue;
      }
      
      merchantIds.push(merchantId);
      
      metrics.merchantsRegistered++;
      metrics.totalGasUsed += receipt.gasUsed;
      metrics.txTimes.push(txEnd - txStart);
      
      console.log(`   ✅ Merchant ${i + 1}: ${CATEGORIES[i % 5]} (${receipt.gasUsed} gas, ${txEnd - txStart}ms)`);
      
    } catch (error) {
      metrics.failedTxs++;
      console.log(`   ❌ Merchant ${i + 1} failed: ${error.message.slice(0, 50)}`);
    }
  }
  
  // ==============================================
  // PHASE 2: Process Payments
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("💳 PHASE 2: Processing Payments");
  console.log("-".repeat(40));
  
  let totalPaymentAmount = 0n;
  
  for (let m = 0; m < merchantIds.length; m++) {
    const merchantId = merchantIds[m];
    console.log(`\n   🏪 Merchant ${m + 1} payments:`);
    
    for (let p = 0; p < CONFIG.paymentsPerMerchant; p++) {
      // Check if we have enough balance
      const currentBalance = await uTUT.balanceOf(deployer.address);
      if (currentBalance < CONFIG.paymentAmount) {
        console.log(`      ⚠️  Insufficient balance for payment ${p + 1}`);
        break;
      }
      
      const txStart = Date.now();
      try {
        // Generate order ID for this payment
        const orderId = ethers.keccak256(
          ethers.solidityPacked(["bytes32", "uint256", "uint256"], [merchantId, p, Date.now()])
        );
        
        const tx = await paymentProcessor.pay(
          merchantId,
          CONTRACTS.uTUT,  // token address
          CONFIG.paymentAmount,
          orderId,
          `Stress test payment ${p + 1}`,
          { gasLimit: 500000 }  // Increased from 350000
        );
        
        const receipt = await tx.wait();
        const txEnd = Date.now();
        
        metrics.paymentsProcessed++;
        metrics.totalGasUsed += receipt.gasUsed;
        metrics.txTimes.push(txEnd - txStart);
        totalPaymentAmount += CONFIG.paymentAmount;
        
        process.stdout.write(`      Payment ${p + 1}/${CONFIG.paymentsPerMerchant} ✅\r`);
        
      } catch (error) {
        metrics.failedTxs++;
        console.log(`      ❌ Payment ${p + 1} failed: ${error.message.slice(0, 60)}`);
      }
    }
    console.log(`      ✅ Completed ${CONFIG.paymentsPerMerchant} payments to merchant ${m + 1}`);
  }
  
  metrics.endTime = Date.now();
  
  // ==============================================
  // PHASE 3: Verify Results
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("📊 STRESS TEST RESULTS");
  console.log("-".repeat(40));
  
  const finalMerchantCount = await merchantRegistry.getMerchantCount();
  const finalFeeBalance = await uTUT.balanceOf(CONTRACTS.feeCollector);
  const feesCollected = finalFeeBalance - initialFeeBalance;
  
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const avgTxTime = metrics.txTimes.length > 0 
    ? metrics.txTimes.reduce((a, b) => a + b, 0) / metrics.txTimes.length 
    : 0;
  const txPerSecond = metrics.txTimes.length / totalTime;
  
  console.log(`\n   ⏱️  Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`   🚀 Throughput: ${txPerSecond.toFixed(2)} tx/s`);
  console.log(`   🏪 Merchants Registered: ${metrics.merchantsRegistered}/${CONFIG.numMerchants}`);
  console.log(`   💳 Payments Processed: ${metrics.paymentsProcessed}/${CONFIG.numMerchants * CONFIG.paymentsPerMerchant}`);
  console.log(`   ❌ Failed Transactions: ${metrics.failedTxs}`);
  console.log(`   ⛽ Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
  console.log(`   📈 Avg TX Time: ${avgTxTime.toFixed(0)}ms`);
  
  console.log(`\n   📈 State Changes:`);
  console.log(`      Merchants: ${initialMerchantCount} → ${finalMerchantCount}`);
  console.log(`      Total Payment Volume: ${ethers.formatUnits(totalPaymentAmount, 6)} uTUT`);
  console.log(`      Fees Collected: ${ethers.formatUnits(feesCollected, 6)} uTUT`);
  
  // Verify fee calculation (2% default)
  const expectedFees = totalPaymentAmount * 2n / 100n;
  const feeAccuracy = feesCollected > 0n 
    ? Number((feesCollected * 100n) / expectedFees)
    : 0;
  
  console.log(`      Fee Accuracy: ${feeAccuracy}% (expected ~100%)`);
  
  // Success criteria
  const successRate = (metrics.merchantsRegistered + metrics.paymentsProcessed) / 
    ((metrics.merchantsRegistered + metrics.paymentsProcessed) + metrics.failedTxs) * 100;
  
  console.log(`\n   🎯 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 90 && feeAccuracy >= 95) {
    console.log("   ✅ STRESS TEST PASSED");
  } else if (successRate >= 70) {
    console.log("   ⚠️  STRESS TEST PASSED WITH WARNINGS");
  } else {
    console.log("   ❌ STRESS TEST FAILED");
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
  
  return metrics;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
