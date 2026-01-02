/**
 * Base Mainnet Deployment Script
 * 
 * Deploys all Tolani Ecosystem contracts to Base Mainnet.
 * 
 * Prerequisites:
 *   1. Deploy TUT on Ethereum L1 first: npx hardhat run scripts/deployments/deploy-l1-tut.js --network mainnet
 *   2. Bridge TUT to Base via https://bridge.base.org
 *   3. Set BASE_TUT_ADDRESS in .env (the bridged TUT address on Base)
 *   4. Fund deployer wallet with ~0.1 ETH on Base
 *   5. Create Gnosis Safe for admin
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/deploy-mainnet.js --network base
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// IMPORTANT: Set this after bridging TUT from L1
// This is the address of TUT on Base (L2) after bridging
const BRIDGED_TUT_ADDRESS = process.env.BASE_TUT_ADDRESS || "";

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
    
    // Training campaigns (uTUT has 6 decimals)
    campaigns: [
        { id: "TOLANI_CONSTRUCTION_TECH_V1", name: "Construction Tech Fundamentals", reward: ethers.parseUnits("2000", 6), budget: ethers.parseUnits("500000", 6) },
        { id: "TOLANI_AI_CLOUD_V1", name: "AI & Cloud Computing", reward: ethers.parseUnits("4000", 6), budget: ethers.parseUnits("1000000", 6) },
        { id: "TOLANI_ESG_TRACK_V1", name: "ESG & Sustainability", reward: ethers.parseUnits("1500", 6), budget: ethers.parseUnits("400000", 6) }
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

    // Check for bridged TUT address
    if (!BRIDGED_TUT_ADDRESS) {
        console.log("❌ ERROR: BASE_TUT_ADDRESS not set in .env\n");
        console.log("You must first:");
        console.log("1. Deploy TUT on Ethereum L1:");
        console.log("   npx hardhat run scripts/deployments/deploy-l1-tut.js --network mainnet\n");
        console.log("2. Bridge TUT to Base via https://bridge.base.org\n");
        console.log("3. Add the bridged address to .env:");
        console.log("   BASE_TUT_ADDRESS=0x...(bridged TUT address on Base)\n");
        return;
    }

    console.log(`📦 Using Bridged TUT: ${BRIDGED_TUT_ADDRESS}\n`);

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("📋 Deployment Info:");
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Network check - allow both Base Mainnet and Base Sepolia
    const isMainnet = network.chainId === 8453n;
    const isTestnet = network.chainId === 84532n;
    
    if (!isMainnet && !isTestnet) {
        console.log("❌ ERROR: This script is for Base networks only");
        console.log(`   Current network chainId: ${network.chainId}`);
        console.log("   Supported: Base Mainnet (8453) or Base Sepolia (84532)");
        return;
    }

    const minBalance = isMainnet ? "0.05" : "0.01";
    if (balance < ethers.parseEther(minBalance)) {
        console.log(`❌ ERROR: Insufficient balance. Need at least ${minBalance} ETH for deployment.`);
        return;
    }

    // Confirmation prompt for mainnet only
    if (isMainnet) {
        console.log("⚠️  WARNING: You are about to deploy to BASE MAINNET (production)");
        console.log("   This will cost real ETH and create live contracts.\n");
        console.log("   Press Ctrl+C within 10 seconds to cancel...\n");
        await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
        console.log("🧪 Deploying to Base Sepolia Testnet...\n");
    }

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

        // Use bridged TUT from L1 (already deployed and bridged)
        console.log("\n1.2 Using Bridged TUT Token from L1...");
        deployed.TUT = BRIDGED_TUT_ADDRESS;
        console.log(`   ✅ TUT (Bridged): ${deployed.TUT}`);
        
        // Verify TUT is accessible using fully qualified name
        const tutToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", deployed.TUT);
        const tutSupply = await tutToken.totalSupply();
        console.log(`   📊 TUT Total Supply: ${ethers.formatUnits(tutSupply, 18)} TUT`);

        // ========================================
        // PHASE 2: Training System
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 2: Training System");
        console.log("=".repeat(50));

        // Session Key Registry (required for TrainingRewards)
        console.log("\n2.1 Deploying SessionKeyRegistry...");
        const SessionRegistry = await ethers.getContractFactory("SessionKeyRegistrySimple");
        const sessionRegistry = await SessionRegistry.deploy(deployer.address);
        await sessionRegistry.waitForDeployment();
        deployed.SessionKeyRegistry = await sessionRegistry.getAddress();
        console.log(`   ✅ SessionKeyRegistry: ${deployed.SessionKeyRegistry}`);

        // TUT Converter
        console.log("\n2.2 Deploying TUTConverter...");
        const Converter = await ethers.getContractFactory("TUTConverterSimple");
        const converter = await Converter.deploy(deployer.address, deployed.TUT, deployed.uTUT);
        await converter.waitForDeployment();
        deployed.TUTConverter = await converter.getAddress();
        console.log(`   ✅ TUTConverter: ${deployed.TUTConverter}`);

        // Training Rewards
        console.log("\n2.3 Deploying TrainingRewards...");
        const Training = await ethers.getContractFactory("TrainingRewardsSimple");
        const training = await Training.deploy(deployer.address, deployed.uTUT, deployed.SessionKeyRegistry);
        await training.waitForDeployment();
        deployed.TrainingRewards = await training.getAddress();
        console.log(`   ✅ TrainingRewards: ${deployed.TrainingRewards}`);

        // Grant MINTER_ROLE to TrainingRewards
        console.log("\n2.4 Configuring roles...");
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        await (await uTUT.grantRole(MINTER_ROLE, deployed.TrainingRewards)).wait();
        console.log("   ✅ MINTER_ROLE granted to TrainingRewards");

        // Create campaigns
        console.log("\n2.5 Creating training campaigns...");
        const now = Math.floor(Date.now() / 1000);
        const oneYear = 365 * 24 * 60 * 60;
        for (const campaign of CONFIG.campaigns) {
            const campaignId = ethers.keccak256(ethers.toUtf8Bytes(campaign.id));
            await (await training.createCampaign(
                campaignId,
                campaign.name,
                campaign.reward,
                campaign.budget,
                now,           // startTime
                now + oneYear  // endTime (1 year)
            )).wait();
            console.log(`   ✅ ${campaign.name}`);
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
        const treasury = await Treasury.deploy(deployer.address);
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
            deployed.TUT,
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
