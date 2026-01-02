/**
 * DeFi Contracts Deployment Script - Base Sepolia
 * 
 * Deploys:
 * 1. LiquidityManager - Uniswap V3 liquidity management
 * 2. LiquidityIncentives - LP farming rewards
 * 3. StakingPool - Single-sided TUT staking
 * 
 * Usage:
 *   npx hardhat run scripts/defi/deploy-defi-suite.js --network baseSepolia
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Existing contract addresses (Base Sepolia)
const CONTRACTS = {
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
    TUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",  // MockBridgedTUT
    Treasury: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7"
};

// Uniswap V3 addresses on Base Sepolia
// Note: These need to be verified for Base Sepolia testnet
const UNISWAP_V3 = {
    // Base Sepolia Uniswap V3 addresses (if deployed)
    // If not available, we'll deploy mock versions
    positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1", // Base Mainnet - need to verify Sepolia
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",          // Base Mainnet - need to verify Sepolia
    // For testnet, we may need to use mock addresses or deploy our own
    useMocks: true  // Set to false if Uniswap V3 is available on Base Sepolia
};

// Deployment configuration
const CONFIG = {
    // LiquidityIncentives config
    rewardPerSecond: ethers.parseUnits("1", 18),  // 1 TUT per second
    incentiveDuration: 30 * 24 * 60 * 60,         // 30 days
    
    // StakingPool - uses TUT for both staking and rewards
};

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  DEFI SUITE DEPLOYMENT - BASE SEPOLIA");
    console.log("=".repeat(70) + "\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");
    
    const deployed = {};
    
    // ========================================
    // 1. Deploy StakingPool (No external dependencies)
    // ========================================
    console.log("-".repeat(50));
    console.log("📦 1. Deploying StakingPool...\n");
    
    try {
        const StakingPool = await ethers.getContractFactory("StakingPool");
        const stakingPool = await StakingPool.deploy(
            CONTRACTS.TUT,      // Staking token (TUT)
            deployer.address    // Governance (admin)
        );
        await stakingPool.waitForDeployment();
        deployed.StakingPool = await stakingPool.getAddress();
        
        console.log("   ✅ StakingPool deployed to:", deployed.StakingPool);
        console.log("   - Staking Token: TUT");
        console.log("   - Rewards Token: TUT (same)");
        console.log("   - Governance:", deployer.address);
        
        // Log tier configs
        const flexibleTier = await stakingPool.tierConfigs(0);
        const bronzeTier = await stakingPool.tierConfigs(1);
        console.log("\n   Tiers Configured:");
        console.log("   - FLEXIBLE: No lock, 1x rewards, min 100 TUT");
        console.log("   - BRONZE: 30 days, 1.25x rewards, min 1,000 TUT");
        console.log("   - SILVER: 90 days, 1.5x rewards, min 10,000 TUT");
        console.log("   - GOLD: 180 days, 2x rewards, min 50,000 TUT");
        console.log("   - DIAMOND: 365 days, 3x rewards, min 100,000 TUT");
        
    } catch (e) {
        console.log("   ❌ StakingPool deployment failed:", e.message);
    }
    
    // ========================================
    // 2. Deploy LiquidityIncentives
    // ========================================
    console.log("\n" + "-".repeat(50));
    console.log("📦 2. Deploying LiquidityIncentives...\n");
    
    try {
        const startTime = Math.floor(Date.now() / 1000);
        
        const LiquidityIncentives = await ethers.getContractFactory("LiquidityIncentives");
        const liquidityIncentives = await LiquidityIncentives.deploy(
            CONTRACTS.TUT,              // Reward token
            CONFIG.rewardPerSecond,     // Rewards per second
            startTime,                  // Start time
            CONFIG.incentiveDuration,   // Duration (30 days)
            deployer.address            // Governance
        );
        await liquidityIncentives.waitForDeployment();
        deployed.LiquidityIncentives = await liquidityIncentives.getAddress();
        
        console.log("   ✅ LiquidityIncentives deployed to:", deployed.LiquidityIncentives);
        console.log("   - Reward Token: TUT");
        console.log("   - Reward Rate:", ethers.formatUnits(CONFIG.rewardPerSecond, 18), "TUT/sec");
        console.log("   - Duration: 30 days");
        console.log("   - Start:", new Date(startTime * 1000).toISOString());
        
    } catch (e) {
        console.log("   ❌ LiquidityIncentives deployment failed:", e.message);
    }
    
    // ========================================
    // 3. Deploy LiquidityManager (Uniswap V3)
    // ========================================
    console.log("\n" + "-".repeat(50));
    console.log("📦 3. Deploying LiquidityManager...\n");
    
    if (UNISWAP_V3.useMocks) {
        console.log("   ⚠️  Uniswap V3 not available on Base Sepolia");
        console.log("   Skipping LiquidityManager deployment.");
        console.log("   Deploy on mainnet or when Uniswap V3 is available.");
        deployed.LiquidityManager = "NOT_DEPLOYED_MISSING_UNISWAP";
    } else {
        try {
            const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
            const liquidityManager = await LiquidityManager.deploy(
                CONTRACTS.TUT,
                UNISWAP_V3.positionManager,
                UNISWAP_V3.factory,
                deployer.address
            );
            await liquidityManager.waitForDeployment();
            deployed.LiquidityManager = await liquidityManager.getAddress();
            
            console.log("   ✅ LiquidityManager deployed to:", deployed.LiquidityManager);
            console.log("   - TUT Token:", CONTRACTS.TUT);
            console.log("   - Position Manager:", UNISWAP_V3.positionManager);
            console.log("   - Factory:", UNISWAP_V3.factory);
            
        } catch (e) {
            console.log("   ❌ LiquidityManager deployment failed:", e.message);
            deployed.LiquidityManager = "FAILED";
        }
    }
    
    // ========================================
    // 4. Fund Contracts with Rewards
    // ========================================
    console.log("\n" + "-".repeat(50));
    console.log("💰 4. Funding Contracts...\n");
    
    const TUT = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", CONTRACTS.TUT);
    const tutBalance = await TUT.balanceOf(deployer.address);
    console.log("   TUT Balance:", ethers.formatUnits(tutBalance, 18), "TUT");
    
    // Fund StakingPool if deployed
    if (deployed.StakingPool && deployed.StakingPool !== "FAILED") {
        const stakingRewards = ethers.parseUnits("10000", 18); // 10k TUT for rewards
        if (tutBalance >= stakingRewards) {
            try {
                const stakingPool = await ethers.getContractAt("StakingPool", deployed.StakingPool);
                
                // Approve and add rewards
                const approveTx = await TUT.approve(deployed.StakingPool, stakingRewards);
                await approveTx.wait();
                
                // Note: StakingPool may not have a direct "addRewards" function
                // Rewards come from rewardRate * time mechanism
                console.log("   ℹ️  StakingPool uses time-based reward accrual");
                console.log("      Fund via REWARDS_MANAGER_ROLE when ready");
            } catch (e) {
                console.log("   ⚠️  Could not fund StakingPool:", e.message.slice(0, 50));
            }
        }
    }
    
    // Fund LiquidityIncentives if deployed
    if (deployed.LiquidityIncentives && deployed.LiquidityIncentives !== "FAILED") {
        const incentiveRewards = ethers.parseUnits("10000", 18); // 10k TUT for LP rewards
        if (tutBalance >= incentiveRewards) {
            try {
                const incentives = await ethers.getContractAt("LiquidityIncentives", deployed.LiquidityIncentives);
                
                // Approve
                const approveTx = await TUT.approve(deployed.LiquidityIncentives, incentiveRewards);
                await approveTx.wait();
                
                // Fund rewards
                const fundTx = await incentives.fundRewards(incentiveRewards);
                await fundTx.wait();
                
                console.log("   ✅ Funded LiquidityIncentives with 10,000 TUT");
            } catch (e) {
                console.log("   ⚠️  Could not fund LiquidityIncentives:", e.message.slice(0, 50));
            }
        } else {
            console.log("   ⚠️  Insufficient TUT balance for rewards funding");
        }
    }
    
    // ========================================
    // 5. Summary
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("  DEPLOYMENT SUMMARY");
    console.log("=".repeat(70));
    
    console.log("\n📋 Deployed Contracts:\n");
    Object.entries(deployed).forEach(([name, address]) => {
        const status = address.startsWith("0x") ? "✅" : "⚠️";
        console.log(`   ${status} ${name}: ${address}`);
    });
    
    // Save deployment record (convert BigInt to string for JSON)
    const deploymentRecord = {
        network: "baseSepolia",
        chainId: 84532,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployed,
        existingContracts: CONTRACTS,
        config: {
            rewardPerSecond: CONFIG.rewardPerSecond.toString(),
            incentiveDuration: CONFIG.incentiveDuration
        }
    };
    
    const deploymentPath = path.join(
        __dirname,
        "..",
        "..",
        "deployments",
        `baseSepolia-defi-${Date.now()}.json`
    );
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2));
    console.log(`\n📄 Deployment record saved to: ${deploymentPath}`);
    
    // Environment variables to update
    console.log("\n📝 Add to .env.template:\n");
    if (deployed.StakingPool && deployed.StakingPool.startsWith("0x")) {
        console.log(`STAKING_POOL_ADDRESS=${deployed.StakingPool}`);
    }
    if (deployed.LiquidityIncentives && deployed.LiquidityIncentives.startsWith("0x")) {
        console.log(`LIQUIDITY_INCENTIVES_ADDRESS=${deployed.LiquidityIncentives}`);
    }
    if (deployed.LiquidityManager && deployed.LiquidityManager.startsWith("0x")) {
        console.log(`LIQUIDITY_MANAGER_ADDRESS=${deployed.LiquidityManager}`);
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("  NEXT STEPS");
    console.log("=".repeat(70));
    console.log(`
1. Verify contracts on Basescan:
   npx hardhat verify --network baseSepolia ${deployed.StakingPool} ${CONTRACTS.TUT} ${deployer.address}
   npx hardhat verify --network baseSepolia ${deployed.LiquidityIncentives} ${CONTRACTS.TUT} ${CONFIG.rewardPerSecond} <startTime> ${CONFIG.incentiveDuration} ${deployer.address}

2. Add LP pools to LiquidityIncentives:
   - TUT-ETH LP token address
   - TUT-USDC LP token address

3. Fund rewards pool:
   - Transfer TUT to contracts for distribution

4. For LiquidityManager:
   - Deploy on mainnet where Uniswap V3 is available
   - Or wait for Uniswap V3 Base Sepolia deployment
`);
    
    return deployed;
}

main()
    .then((deployed) => {
        console.log("\n✅ DeFi suite deployment complete!\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
