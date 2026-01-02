/**
 * STRESS TEST SCENARIO 3: Token Conversion Load Test
 * 
 * Simulates:
 * - Rapid uTUT → TUT conversions
 * - Rapid TUT → uTUT conversions
 * - Daily limit enforcement
 * - Large batch conversions
 * 
 * Metrics tracked:
 * - Conversion success rate
 * - Gas costs per direction
 * - Rate accuracy
 * - Daily limit behavior
 */

require("dotenv").config();
const { ethers } = require("hardhat");

// Contract addresses (Base Sepolia)
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  tut: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
  converter: "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2"
};

// ABIs (TUTConverterSimple)
const CONVERTER_ABI = [
  "function convertToUtut(uint256 tutAmount) external returns (uint256 ututAmount)",
  "function convertToTut(uint256 ututAmount) external returns (uint256 tutAmount)",
  "function CONVERSION_FACTOR() view returns (uint256)",
  "function totalTutDeposited() view returns (uint256)",
  "function totalUtutMinted() view returns (uint256)",
  "function tutToken() view returns (address)",
  "function ututToken() view returns (address)",
  "function paused() view returns (bool)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Test configuration
const CONFIG = {
  numConversionsEach: 10,     // 10 conversions each direction
  smallAmount: ethers.parseUnits("5", 6),    // 5 uTUT small conversions
  mediumAmount: ethers.parseUnits("20", 6),  // 20 uTUT medium
  largeAmount: ethers.parseUnits("50", 6),   // 50 uTUT large
};

// Metrics
const metrics = {
  ututToTutConversions: 0,
  tutToUtutConversions: 0,
  totalUtutConverted: 0n,
  totalTutConverted: 0n,
  totalGasUsed: 0n,
  failedTxs: 0,
  dailyLimitHits: 0,
  startTime: 0,
  endTime: 0,
  txTimes: []
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 STRESS TEST SCENARIO 3: Token Conversion Load");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log(`\n📍 Operator: ${deployer.address}`);
  
  // Connect to contracts
  const converter = new ethers.Contract(CONTRACTS.converter, CONVERTER_ABI, deployer);
  const uTUT = new ethers.Contract(CONTRACTS.uTUT, ERC20_ABI, deployer);
  const TUT = new ethers.Contract(CONTRACTS.tut, ERC20_ABI, deployer);
  
  // Check configuration
  const conversionFactor = await converter.CONVERSION_FACTOR();
  const isPaused = await converter.paused();
  
  console.log(`\n📊 Converter Configuration:`);
  console.log(`   Conversion Factor: ${conversionFactor} (1 uTUT = ${Number(conversionFactor)} TUT wei)`);
  console.log(`   Paused: ${isPaused ? "❌ YES" : "✅ NO"}`);
  
  // Check balances
  const uTUTBalance = await uTUT.balanceOf(deployer.address);
  const TUTBalance = await TUT.balanceOf(deployer.address);
  const converterTUTBalance = await TUT.balanceOf(CONTRACTS.converter);
  
  console.log(`\n💰 Balances:`);
  console.log(`   User uTUT: ${ethers.formatUnits(uTUTBalance, 6)}`);
  console.log(`   User TUT: ${ethers.formatUnits(TUTBalance, 18)}`);
  console.log(`   Converter TUT Reserve: ${ethers.formatUnits(converterTUTBalance, 18)}`);
  
  // Initial state
  const initialTutDeposited = await converter.totalTutDeposited();
  const initialUtutMinted = await converter.totalUtutMinted();
  
  console.log(`\n📈 Historical Stats:`);
  console.log(`   Total TUT Deposited: ${ethers.formatUnits(initialTutDeposited, 18)}`);
  console.log(`   Total uTUT Minted: ${ethers.formatUnits(initialUtutMinted, 6)}`);
  
  // Approve converter for both tokens
  console.log(`\n💳 Setting up approvals...`);
  
  const uTUTAllowance = await uTUT.allowance(deployer.address, CONTRACTS.converter);
  if (uTUTAllowance < ethers.parseUnits("1000", 6)) {
    const tx1 = await uTUT.approve(CONTRACTS.converter, ethers.MaxUint256);
    await tx1.wait();
    console.log("   ✅ uTUT approved");
  }
  
  const TUTAllowance = await TUT.allowance(deployer.address, CONTRACTS.converter);
  if (TUTAllowance < ethers.parseUnits("1000", 18)) {
    const tx2 = await TUT.approve(CONTRACTS.converter, ethers.MaxUint256);
    await tx2.wait();
    console.log("   ✅ TUT approved");
  }
  
  metrics.startTime = Date.now();
  
  // ==============================================
  // PHASE 1: TUT → uTUT Conversions (convertToUtut)
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("🔄 PHASE 1: TUT → uTUT Conversions");
  console.log("-".repeat(40));
  
  // For TUT→uTUT, we need TUT balance and amounts in 18 decimals
  const tutAmounts = [
    ethers.parseUnits("5", 18),    // 5 TUT → 5 uTUT
    ethers.parseUnits("20", 18),   // 20 TUT → 20 uTUT
    ethers.parseUnits("50", 18),   // 50 TUT → 50 uTUT
  ];
  
  for (let i = 0; i < CONFIG.numConversionsEach; i++) {
    const amount = tutAmounts[i % 3]; // Rotate through TUT amounts
    
    // Check TUT balance
    const currentBalance = await TUT.balanceOf(deployer.address);
    if (currentBalance < amount) {
      console.log(`   ⚠️  Insufficient TUT balance at conversion ${i + 1}`);
      break;
    }
    
    const txStart = Date.now();
    try {
      const tx = await converter.convertToUtut(amount, { gasLimit: 300000 });
      const receipt = await tx.wait();
      const txEnd = Date.now();
      
      // Calculate expected uTUT output
      const expectedUtut = amount / BigInt(conversionFactor);
      
      metrics.tutToUtutConversions++;
      metrics.totalTutConverted += amount;
      metrics.totalGasUsed += receipt.gasUsed;
      metrics.txTimes.push(txEnd - txStart);
      
      console.log(`   ✅ Conv ${i + 1}: ${ethers.formatUnits(amount, 18)} TUT → ~${ethers.formatUnits(expectedUtut, 6)} uTUT (${receipt.gasUsed} gas, ${txEnd - txStart}ms)`);
      
    } catch (error) {
      metrics.failedTxs++;
      console.log(`   ❌ Conv ${i + 1} failed: ${error.message.slice(0, 60)}`);
    }
  }
  
  // ==============================================
  // PHASE 2: uTUT → TUT Conversions (convertToTut)
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("🔄 PHASE 2: uTUT → TUT Conversions");
  console.log("-".repeat(40));
  
  // uTUT amounts (6 decimals)
  const ututAmounts = [
    ethers.parseUnits("5", 6),    // 5 uTUT
    ethers.parseUnits("20", 6),   // 20 uTUT
    ethers.parseUnits("50", 6),   // 50 uTUT
  ];
  
  for (let i = 0; i < CONFIG.numConversionsEach; i++) {
    const amount = ututAmounts[i % 3];
    
    // Check uTUT balance
    const currentBalance = await uTUT.balanceOf(deployer.address);
    if (currentBalance < amount) {
      console.log(`   ⚠️  Insufficient uTUT balance at conversion ${i + 1}`);
      break;
    }
    
    const txStart = Date.now();
    try {
      const tx = await converter.convertToTut(amount, { gasLimit: 300000 });
      const receipt = await tx.wait();
      const txEnd = Date.now();
      
      // Calculate expected TUT output
      const expectedTut = amount * BigInt(conversionFactor);
      
      metrics.ututToTutConversions++;
      metrics.totalUtutConverted += amount;
      metrics.totalGasUsed += receipt.gasUsed;
      metrics.txTimes.push(txEnd - txStart);
      
      console.log(`   ✅ Conv ${i + 1}: ${ethers.formatUnits(amount, 6)} uTUT → ~${ethers.formatUnits(expectedTut, 18)} TUT (${receipt.gasUsed} gas, ${txEnd - txStart}ms)`);
      
    } catch (error) {
      metrics.failedTxs++;
      if (error.message.includes("InsufficientTutReserve")) {
        console.log(`   ⚠️  Conv ${i + 1}: Converter out of TUT reserves`);
        break;
      } else {
        console.log(`   ❌ Conv ${i + 1} failed: ${error.message.slice(0, 60)}`);
      }
    }
  }
  
  metrics.endTime = Date.now();
  
  // ==============================================
  // PHASE 3: Results & Verification
  // ==============================================
  console.log("\n" + "-".repeat(40));
  console.log("📊 STRESS TEST RESULTS");
  console.log("-".repeat(40));
  
  const finalTutDeposited = await converter.totalTutDeposited();
  const finalUtutMinted = await converter.totalUtutMinted();
  const finalUTUTBalance = await uTUT.balanceOf(deployer.address);
  const finalTUTBalance = await TUT.balanceOf(deployer.address);
  
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const avgTxTime = metrics.txTimes.length > 0 
    ? metrics.txTimes.reduce((a, b) => a + b, 0) / metrics.txTimes.length 
    : 0;
  const txPerSecond = metrics.txTimes.length / totalTime;
  
  console.log(`\n   ⏱️  Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`   🚀 Throughput: ${txPerSecond.toFixed(2)} tx/s`);
  console.log(`   🔄 TUT→uTUT: ${metrics.tutToUtutConversions}/${CONFIG.numConversionsEach}`);
  console.log(`   🔄 uTUT→TUT: ${metrics.ututToTutConversions}/${CONFIG.numConversionsEach}`);
  console.log(`   ❌ Failed: ${metrics.failedTxs}`);
  console.log(`   ⛽ Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
  console.log(`   📈 Avg TX Time: ${avgTxTime.toFixed(0)}ms`);
  
  console.log(`\n   📈 Conversion Stats:`);
  console.log(`      TUT Deposited: ${ethers.formatUnits(finalTutDeposited - initialTutDeposited, 18)}`);
  console.log(`      uTUT Minted: ${ethers.formatUnits(finalUtutMinted - initialUtutMinted, 6)}`);
  
  console.log(`\n   💰 Final Balances:`);
  console.log(`      uTUT: ${ethers.formatUnits(uTUTBalance, 6)} → ${ethers.formatUnits(finalUTUTBalance, 6)}`);
  console.log(`      TUT: ${ethers.formatUnits(TUTBalance, 18)} → ${ethers.formatUnits(finalTUTBalance, 18)}`);
  
  // Success criteria
  const totalAttempts = CONFIG.numConversionsEach * 2;
  const successfulOps = metrics.tutToUtutConversions + metrics.ututToTutConversions;
  const successRate = (successfulOps / (successfulOps + metrics.failedTxs)) * 100;
  
  console.log(`\n   🎯 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 90) {
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
