/**
 * Gas Estimation Script for Mainnet Deployment
 * 
 * Estimates gas costs for deploying all contracts to mainnet.
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/estimate-mainnet-gas.js
 */

const { ethers } = require("hardhat");

// Current gas prices (update before deployment)
const GAS_PRICES = {
    // Base Mainnet (L2) - typically much cheaper
    base: {
        gasPrice: 0.001,  // ~0.001 gwei on Base L2
        ethPrice: 3500,   // ETH price in USD
        name: "Base Mainnet"
    },
    // Ethereum Mainnet (L1)
    ethereum: {
        gasPrice: 30,     // ~30 gwei on Ethereum
        ethPrice: 3500,   // ETH price in USD
        name: "Ethereum Mainnet"
    }
};

// Contract deployment gas estimates (from actual deployments)
const GAS_ESTIMATES = {
    // Training System
    uTUTSimple: 1_200_000,
    MockBridgedTUT: 1_500_000,
    TUTConverterSimple: 800_000,
    TrainingRewardsSimple: 1_800_000,
    
    // Payment System
    MerchantRegistry: 1_500_000,
    TolaniPaymentProcessor: 2_000_000,
    TolaniTreasury: 1_200_000,
    
    // DeFi Contracts
    StakingPool: 2_500_000,
    LiquidityIncentives: 2_200_000,
    LiquidityManager: 3_000_000,
    
    // Governance (if deploying fresh)
    TUTTokenSmartV2: 2_000_000,
    TolaniGovernor: 3_500_000,
    TolaniTimelock: 1_500_000,
    TokenAllocator: 2_000_000
};

// Group contracts by deployment phase
const DEPLOYMENT_PHASES = {
    "Phase 1: Core Token": [
        "TUTTokenSmartV2",
        "uTUTSimple"
    ],
    "Phase 2: Training": [
        "MockBridgedTUT",
        "TUTConverterSimple", 
        "TrainingRewardsSimple"
    ],
    "Phase 3: Payments": [
        "MerchantRegistry",
        "TolaniPaymentProcessor",
        "TolaniTreasury"
    ],
    "Phase 4: DeFi": [
        "StakingPool",
        "LiquidityIncentives",
        "LiquidityManager"
    ],
    "Phase 5: Governance": [
        "TolaniGovernor",
        "TolaniTimelock",
        "TokenAllocator"
    ]
};

function calculateCost(gasUnits, network) {
    const { gasPrice, ethPrice } = GAS_PRICES[network];
    const ethCost = (gasUnits * gasPrice) / 1_000_000_000; // Convert gwei to ETH
    const usdCost = ethCost * ethPrice;
    return { ethCost, usdCost };
}

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  MAINNET DEPLOYMENT GAS ESTIMATION");
    console.log("=".repeat(70) + "\n");

    console.log("📊 Gas Price Assumptions:");
    console.log(`   Base Mainnet: ${GAS_PRICES.base.gasPrice} gwei`);
    console.log(`   Ethereum Mainnet: ${GAS_PRICES.ethereum.gasPrice} gwei`);
    console.log(`   ETH Price: $${GAS_PRICES.ethereum.ethPrice}`);
    console.log("");

    let totalGas = 0;
    const phaseResults = [];

    // Calculate per-phase costs
    for (const [phase, contracts] of Object.entries(DEPLOYMENT_PHASES)) {
        console.log("-".repeat(50));
        console.log(`📦 ${phase}`);
        console.log("-".repeat(50));

        let phaseGas = 0;
        for (const contract of contracts) {
            const gas = GAS_ESTIMATES[contract] || 1_000_000;
            phaseGas += gas;
            
            const baseCost = calculateCost(gas, "base");
            const ethCost = calculateCost(gas, "ethereum");

            console.log(`   ${contract}`);
            console.log(`      Gas: ${gas.toLocaleString()}`);
            console.log(`      Base L2: ${baseCost.ethCost.toFixed(6)} ETH ($${baseCost.usdCost.toFixed(2)})`);
            console.log(`      Ethereum: ${ethCost.ethCost.toFixed(4)} ETH ($${ethCost.usdCost.toFixed(2)})`);
            console.log("");
        }

        const phaseBaseCost = calculateCost(phaseGas, "base");
        const phaseEthCost = calculateCost(phaseGas, "ethereum");

        phaseResults.push({
            phase,
            gas: phaseGas,
            baseCost: phaseBaseCost,
            ethCost: phaseEthCost
        });

        totalGas += phaseGas;
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("  COST SUMMARY");
    console.log("=".repeat(70) + "\n");

    console.log("📋 Per-Phase Costs:\n");
    console.log("| Phase | Gas | Base L2 | Ethereum |");
    console.log("|-------|-----|---------|----------|");
    
    for (const result of phaseResults) {
        console.log(`| ${result.phase.slice(0, 20).padEnd(20)} | ${(result.gas / 1_000_000).toFixed(1)}M | $${result.baseCost.usdCost.toFixed(2).padStart(6)} | $${result.ethCost.usdCost.toFixed(2).padStart(7)} |`);
    }

    const totalBaseCost = calculateCost(totalGas, "base");
    const totalEthCost = calculateCost(totalGas, "ethereum");

    console.log("|-------|-----|---------|----------|");
    console.log(`| **TOTAL** | ${(totalGas / 1_000_000).toFixed(1)}M | $${totalBaseCost.usdCost.toFixed(2).padStart(6)} | $${totalEthCost.usdCost.toFixed(2).padStart(7)} |`);

    console.log("\n" + "=".repeat(70));
    console.log("  RECOMMENDATIONS");
    console.log("=".repeat(70));
    console.log(`
1. 🎯 RECOMMENDED: Deploy on Base Mainnet (L2)
   - Total Cost: ~$${totalBaseCost.usdCost.toFixed(2)} USD
   - Fast finality, low fees
   - Uniswap V3 available

2. 💰 Budget Requirements:
   - Base L2: ${totalBaseCost.ethCost.toFixed(4)} ETH (~$${totalBaseCost.usdCost.toFixed(2)})
   - Add 20% buffer: ${(totalBaseCost.ethCost * 1.2).toFixed(4)} ETH
   - Recommended wallet balance: 0.1 ETH

3. ⛽ Gas Optimization Tips:
   - Deploy during low traffic periods (weekends)
   - Batch role configurations where possible
   - Consider proxy patterns for upgradeability

4. 📝 Pre-Deployment Checklist:
   - [ ] Fund deployer wallet with ETH
   - [ ] Create Gnosis Safe multi-sig
   - [ ] Verify all contract source code locally
   - [ ] Double-check constructor parameters
   - [ ] Have team review deployment plan

5. 🔐 Post-Deployment:
   - [ ] Verify all contracts on Basescan
   - [ ] Transfer admin to Gnosis Safe
   - [ ] Test basic functionality
   - [ ] Monitor for first 24 hours
`);

    // Return estimates for programmatic use
    return {
        totalGas,
        base: totalBaseCost,
        ethereum: totalEthCost,
        phases: phaseResults
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
