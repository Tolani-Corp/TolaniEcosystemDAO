/**
 * Base Mainnet Deployment Script
 * 
 * Deploys all Tolani Ecosystem contracts to Base Mainnet.
 * 
 * Prerequisites:
 *   1. Fund deployer wallet with ~0.1 ETH on Base
 *   2. Set BASE_MAINNET_RPC_URL in .env
 *   3. Create Gnosis Safe for admin
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/deploy-mainnet.js --network base
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Uniswap V3 addresses on Base Mainnet
const UNISWAP_V3_BASE = {
    positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481"
};

// Configuration
const CONFIG = {
    // Token settings
    tutInitialSupply: ethers.parseUnits("100000000", 18), // 100M TUT
    uTutMintCap: ethers.parseUnits("100000000", 6),       // 100M uTUT
    
    // Training campaigns
    campaigns: [
        { id: "TOLANI_CONSTRUCTION_TECH_V1", reward: ethers.parseUnits("2000", 6), budget: ethers.parseUnits("500000", 6) },
        { id: "TOLANI_AI_CLOUD_V1", reward: ethers.parseUnits("4000", 6), budget: ethers.parseUnits("1000000", 6) },
        { id: "TOLANI_ESG_TRACK_V1", reward: ethers.parseUnits("1500", 6), budget: ethers.parseUnits("400000", 6) }
    ],
    
    // DeFi settings
    stakingRewardRate: ethers.parseUnits("0.1", 18), // 0.1 TUT per second
    lpIncentiveDuration: 90 * 24 * 60 * 60,         // 90 days
    
    // Payment settings
    platformFeeBps: 100, // 1%
};

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  TOLANI ECOSYSTEM - BASE MAINNET DEPLOYMENT");
    console.log("=".repeat(70) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("📋 Deployment Info:");
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Safety check
    if (network.chainId !== 8453n) {
        console.log("❌ ERROR: This script is for Base Mainnet (chainId: 8453)");
        console.log(`   Current network chainId: ${network.chainId}`);
        console.log("\n   To deploy to testnet, use: npx hardhat run scripts/deploy.js --network baseSepolia");
        return;
    }

    if (balance < ethers.parseEther("0.05")) {
        console.log("❌ ERROR: Insufficient balance. Need at least 0.05 ETH for deployment.");
        return;
    }

    // Confirmation prompt
    console.log("⚠️  WARNING: You are about to deploy to BASE MAINNET (production)");
    console.log("   This will cost real ETH and create live contracts.\n");
    console.log("   Press Ctrl+C within 10 seconds to cancel...\n");
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    const deployed = {};
    const startTime = Date.now();

    try {
        // ========================================
        // PHASE 1: Core Tokens
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 1: Core Tokens");
        console.log("=".repeat(50));

        // Deploy uTUT (training rewards token)
        console.log("\n1.1 Deploying uTUT Token...");
        const UTUT = await ethers.getContractFactory("uTUTSimple");
        const uTUT = await UTUT.deploy(deployer.address, CONFIG.uTutMintCap);
        await uTUT.waitForDeployment();
        deployed.uTUT = await uTUT.getAddress();
        console.log(`   ✅ uTUT: ${deployed.uTUT}`);

        // For mainnet, we'll use bridged TUT from L1
        // For now, deploy MockBridgedTUT as placeholder
        console.log("\n1.2 Deploying TUT Token (Bridged)...");
        const TUT = await ethers.getContractFactory("MockBridgedTUT");
        const tut = await TUT.deploy(deployer.address);
        await tut.waitForDeployment();
        deployed.TUT = await tut.getAddress();
        console.log(`   ✅ TUT: ${deployed.TUT}`);

        // ========================================
        // PHASE 2: Training System
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 2: Training System");
        console.log("=".repeat(50));

        // TUT Converter
        console.log("\n2.1 Deploying TUTConverter...");
        const Converter = await ethers.getContractFactory("TUTConverterSimple");
        const converter = await Converter.deploy(deployed.TUT, deployed.uTUT, deployer.address);
        await converter.waitForDeployment();
        deployed.TUTConverter = await converter.getAddress();
        console.log(`   ✅ TUTConverter: ${deployed.TUTConverter}`);

        // Training Rewards
        console.log("\n2.2 Deploying TrainingRewards...");
        const Training = await ethers.getContractFactory("TrainingRewardsSimple");
        const training = await Training.deploy(deployer.address, deployed.uTUT);
        await training.waitForDeployment();
        deployed.TrainingRewards = await training.getAddress();
        console.log(`   ✅ TrainingRewards: ${deployed.TrainingRewards}`);

        // Grant MINTER_ROLE to TrainingRewards
        console.log("\n2.3 Configuring roles...");
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        await (await uTUT.grantRole(MINTER_ROLE, deployed.TrainingRewards)).wait();
        console.log("   ✅ MINTER_ROLE granted to TrainingRewards");

        // Create campaigns
        console.log("\n2.4 Creating training campaigns...");
        for (const campaign of CONFIG.campaigns) {
            const campaignId = ethers.keccak256(ethers.toUtf8Bytes(campaign.id));
            await (await training.createCampaign(campaignId, campaign.reward, campaign.budget)).wait();
            console.log(`   ✅ ${campaign.id}`);
        }

        // ========================================
        // PHASE 3: Payment System
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 3: Payment System");
        console.log("=".repeat(50));

        // Treasury
        console.log("\n3.1 Deploying Treasury...");
        const Treasury = await ethers.getContractFactory("TolaniTreasury");
        const treasury = await Treasury.deploy();
        await treasury.waitForDeployment();
        deployed.Treasury = await treasury.getAddress();
        console.log(`   ✅ Treasury: ${deployed.Treasury}`);

        // Merchant Registry
        console.log("\n3.2 Deploying MerchantRegistry...");
        const Registry = await ethers.getContractFactory("MerchantRegistry");
        const registry = await Registry.deploy(deployer.address);
        await registry.waitForDeployment();
        deployed.MerchantRegistry = await registry.getAddress();
        console.log(`   ✅ MerchantRegistry: ${deployed.MerchantRegistry}`);

        // Payment Processor
        console.log("\n3.3 Deploying PaymentProcessor...");
        const Processor = await ethers.getContractFactory("TolaniPaymentProcessor");
        const processor = await Processor.deploy(
            deployed.uTUT,
            deployed.MerchantRegistry,
            deployed.Treasury,
            deployer.address
        );
        await processor.waitForDeployment();
        deployed.PaymentProcessor = await processor.getAddress();
        console.log(`   ✅ PaymentProcessor: ${deployed.PaymentProcessor}`);

        // ========================================
        // PHASE 4: DeFi Contracts
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 4: DeFi Contracts");
        console.log("=".repeat(50));

        // Staking Pool
        console.log("\n4.1 Deploying StakingPool...");
        const Staking = await ethers.getContractFactory("StakingPool");
        const staking = await Staking.deploy(deployed.TUT, deployer.address);
        await staking.waitForDeployment();
        deployed.StakingPool = await staking.getAddress();
        console.log(`   ✅ StakingPool: ${deployed.StakingPool}`);

        // Liquidity Incentives
        console.log("\n4.2 Deploying LiquidityIncentives...");
        const startTimestamp = Math.floor(Date.now() / 1000);
        const Incentives = await ethers.getContractFactory("LiquidityIncentives");
        const incentives = await Incentives.deploy(
            deployed.TUT,
            CONFIG.stakingRewardRate,
            startTimestamp,
            CONFIG.lpIncentiveDuration,
            deployer.address
        );
        await incentives.waitForDeployment();
        deployed.LiquidityIncentives = await incentives.getAddress();
        console.log(`   ✅ LiquidityIncentives: ${deployed.LiquidityIncentives}`);

        // Liquidity Manager (Uniswap V3)
        console.log("\n4.3 Deploying LiquidityManager...");
        const LiqManager = await ethers.getContractFactory("LiquidityManager");
        const liqManager = await LiqManager.deploy(
            deployed.TUT,
            UNISWAP_V3_BASE.positionManager,
            UNISWAP_V3_BASE.factory,
            deployer.address
        );
        await liqManager.waitForDeployment();
        deployed.LiquidityManager = await liqManager.getAddress();
        console.log(`   ✅ LiquidityManager: ${deployed.LiquidityManager}`);

        // ========================================
        // DEPLOYMENT SUMMARY
        // ========================================
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log("\n" + "=".repeat(70));
        console.log("  DEPLOYMENT COMPLETE");
        console.log("=".repeat(70));
        console.log(`\n⏱️  Duration: ${duration} seconds`);
        console.log("\n📋 Deployed Contracts:\n");
        
        Object.entries(deployed).forEach(([name, address]) => {
            console.log(`   ${name}: ${address}`);
        });

        // Save deployment record
        const deploymentRecord = {
            network: "base",
            chainId: 8453,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: deployed,
            uniswapV3: UNISWAP_V3_BASE,
            config: {
                uTutMintCap: CONFIG.uTutMintCap.toString(),
                campaigns: CONFIG.campaigns.map(c => c.id),
                lpIncentiveDuration: CONFIG.lpIncentiveDuration
            }
        };

        const deploymentPath = path.join(
            __dirname,
            "..",
            "..",
            "deployments",
            `base-mainnet-${Date.now()}.json`
        );
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2));
        console.log(`\n📄 Deployment record: ${deploymentPath}`);

        // Next steps
        console.log("\n" + "=".repeat(70));
        console.log("  NEXT STEPS");
        console.log("=".repeat(70));
        console.log(`
1. Verify contracts on Basescan:
   npx hardhat verify --network base ${deployed.uTUT} ${deployer.address} ${CONFIG.uTutMintCap}
   (repeat for all contracts)

2. Transfer admin to Gnosis Safe:
   npx hardhat run scripts/deployments/transfer-to-multisig.js --network base

3. Test critical functions:
   - Create a test merchant
   - Process a small payment
   - Grant a training reward

4. Monitor:
   - Watch for first 24 hours
   - Set up alerts for large transactions
`);

        return deployed;

    } catch (error) {
        console.error("\n❌ DEPLOYMENT FAILED:", error.message);
        console.log("\nPartially deployed contracts:");
        Object.entries(deployed).forEach(([name, address]) => {
            console.log(`   ${name}: ${address}`);
        });
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
