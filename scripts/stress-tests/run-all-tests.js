/**
 * MASTER STRESS TEST RUNNER
 * 
 * Runs all 3 stress test scenarios and generates a summary report
 * 
 * Usage:
 *   npx hardhat run scripts/stress-tests/run-all-tests.js --network baseSepolia
 */

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const scenarios = [
  {
    name: "High Volume Training",
    script: "scenario-1-training-volume.js",
    description: "Mass campaign creation and reward distribution"
  },
  {
    name: "Payment Rails Load",
    script: "scenario-2-payment-rails.js", 
    description: "Merchant registration and payment processing"
  },
  {
    name: "Token Conversion Load",
    script: "scenario-3-conversion-load.js",
    description: "Rapid bidirectional token conversions"
  }
];

async function runAllTests() {
  console.log("\n" + "═".repeat(70));
  console.log("🏋️  TOLANI DAO STRESS TEST SUITE");
  console.log("═".repeat(70));
  console.log(`\n📅 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Network: Base Sepolia (Chain ID: 84532)`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log("\n" + "─".repeat(70));
    console.log(`\n🧪 SCENARIO ${i + 1}/${scenarios.length}: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log("─".repeat(70) + "\n");
    
    const scenarioStart = Date.now();
    let passed = false;
    let output = "";
    
    try {
      const cmd = `npx hardhat run scripts/stress-tests/${scenario.script} --network baseSepolia`;
      output = execSync(cmd, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["inherit", "pipe", "pipe"],
        timeout: 300000 // 5 minute timeout per test
      });
      
      console.log(output);
      
      // Check if passed
      passed = output.includes("STRESS TEST PASSED");
      
    } catch (error) {
      console.log(`\n❌ Scenario failed with error:`);
      console.log(error.message);
      output = error.stdout || error.message;
    }
    
    const scenarioTime = (Date.now() - scenarioStart) / 1000;
    
    results.push({
      name: scenario.name,
      passed,
      time: scenarioTime,
      output
    });
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  // Generate summary report
  console.log("\n" + "═".repeat(70));
  console.log("📋 STRESS TEST SUMMARY REPORT");
  console.log("═".repeat(70));
  
  const passedCount = results.filter(r => r.passed).length;
  
  console.log(`\n⏱️  Total Duration: ${totalTime.toFixed(1)}s`);
  console.log(`📊 Results: ${passedCount}/${results.length} scenarios passed\n`);
  
  results.forEach((result, idx) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`   ${icon} Scenario ${idx + 1}: ${result.name} (${result.time.toFixed(1)}s)`);
  });
  
  // Overall verdict
  console.log("\n" + "─".repeat(40));
  if (passedCount === results.length) {
    console.log("🎉 ALL STRESS TESTS PASSED - READY FOR MAINNET");
  } else if (passedCount >= results.length * 0.66) {
    console.log("⚠️  MOST TESTS PASSED - REVIEW FAILURES BEFORE MAINNET");
  } else {
    console.log("❌ MULTIPLE FAILURES - DO NOT DEPLOY TO MAINNET");
  }
  console.log("─".repeat(40));
  
  // Save report
  const reportPath = path.join(__dirname, `stress-test-report-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    network: "baseSepolia",
    totalTime,
    passedCount,
    totalScenarios: results.length,
    results: results.map(r => ({
      name: r.name,
      passed: r.passed,
      time: r.time
    }))
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved: ${reportPath}\n`);
  
  return passedCount === results.length;
}

runAllTests()
  .then((allPassed) => process.exit(allPassed ? 0 : 1))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
