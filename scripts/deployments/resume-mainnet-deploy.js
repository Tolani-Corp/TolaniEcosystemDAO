/**
 * Resume Base Mainnet Deployment Script
 * 
 * Continues deployment from where the previous run failed.
 * Uses already-deployed contracts and deploys remaining ones.
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/resume-mainnet-deploy.js --network base
 */

const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { BASE_MAINNET_ADDRESSES } = require("./base-mainnet-addresses");

// Already deployed contracts from partial deployment
const DEPLOYED = {
    TUT: BASE_MAINNET_ADDRESSES.tut,
    uTUT: BASE_MAINNET_ADDRESSES.uTut,
    SessionKeyRegistry: BASE_MAINNET_ADDRESSES.sessionKeyRegistry,
    TUTConverter: BASE_MAINNET_ADDRESSES.tutConverter,
    TrainingRewards: BASE_MAINNET_ADDRESSES.trainingRewards,
    Timelock: BASE_MAINNET_ADDRESSES.timelock,
    Governor: BASE_MAINNET_ADDRESSES.governor,
    Treasury: BASE_MAINNET_ADDRESSES.treasury,
    Staking: BASE_MAINNET_ADDRESSES.stakingPool
};

// Uniswap V3 addresses on Base Mainnet
const UNISWAP_V3_BASE = {
    positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481"
};

// Configuration
const CONFIG = {
    uTutMintCap: ethers.parseUnits("100000000", 6),
    campaigns: [
        { id: "TOLANI_CONSTRUCTION_TECH_V1", name: "Construction Tech Fundamentals", reward: ethers.parseUnits("2000", 6), budget: ethers.parseUnits("500000", 6) },
        { id: "TOLANI_AI_CLOUD_V1", name: "AI & Cloud Computing", reward: ethers.parseUnits("4000", 6), budget: ethers.parseUnits("1000000", 6) },
        { id: "TOLANI_ESG_TRACK_V1", name: "ESG & Sustainability", reward: ethers.parseUnits("1500", 6), budget: ethers.parseUnits("400000", 6) }
    ],
    stakingRewardRate: ethers.parseUnits("0.1", 18),
    lpIncentiveDuration: 90 * 24 * 60 * 60,
    platformFeeBps: 100,
};

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  TOLANI ECOSYSTEM - RESUME BASE MAINNET DEPLOYMENT");
    console.log("=".repeat(70) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("📋 Deployment Info:");
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

    console.log("📦 Using Previously Deployed Contracts:");
    console.log(`   TUT: ${DEPLOYED.TUT}`);
    console.log(`   uTUT: ${DEPLOYED.uTUT}`);
    console.log(`   SessionKeyRegistry: ${DEPLOYED.SessionKeyRegistry}\n`);

    if (network.chainId === 8453n) {
        console.log("⚠️  WARNING: Deploying to BASE MAINNET");
        console.log("   Press Ctrl+C within 5 seconds to cancel...\n");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const deployed = { ...DEPLOYED };
    const startTime = Date.now();

    try {
        // ========================================
        // PHASE 2: Training System (continue)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 2: Training System (Resuming)");
        console.log("=".repeat(50));

        // TUTConverter already deployed
        console.log("\n2.2 Using Previously Deployed TUTConverter...");
        console.log(`   ✅ TUTConverter: ${deployed.TUTConverter}`);

        // Wait for nonce to settle
        console.log("\n   ⏳ Waiting 10s for nonce to settle...");
        await new Promise(resolve => setTimeout(resolve, 10000));

        // TrainingRewards already deployed
        console.log("\n2.3 Using Previously Deployed TrainingRewards...");
        console.log(`   ✅ TrainingRewards: ${deployed.TrainingRewards}`);

        // Wait for nonce to settle
        await new Promise(resolve => setTimeout(resolve, 5000));

        // ========================================
        // PHASE 3: Governance
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 3: Governance");
        console.log("=".repeat(50));

        // Timelock already deployed
        console.log("\n3.1 Using Previously Deployed Timelock...");
        console.log(`   ✅ Timelock: ${deployed.Timelock}`);

        // Wait for nonce to settle
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Deploy Governor (or use existing)
        if (DEPLOYED.Governor) {
            console.log("\n3.2 Using Previously Deployed Governor...");
            deployed.Governor = DEPLOYED.Governor;
            console.log(`   ✅ Governor: ${deployed.Governor}`);
        } else {
            console.log("\n3.2 Deploying Governor...");
            const Governor = await ethers.getContractFactory("TolaniEcosystemGovernor");
            const governor = await Governor.deploy(
                deployed.TUT,
                deployed.Timelock
            );
            await governor.waitForDeployment();
            deployed.Governor = await governor.getAddress();
            console.log(`   ✅ Governor: ${deployed.Governor}`);
        }

        // ========================================
        // PHASE 4: Treasury
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 4: Treasury");
        console.log("=".repeat(50));

        // Deploy Treasury (or use existing)
        if (DEPLOYED.Treasury) {
            console.log("\n4.1 Using Previously Deployed Treasury...");
            deployed.Treasury = DEPLOYED.Treasury;
            console.log(`   ✅ Treasury: ${deployed.Treasury}`);
        } else {
            console.log("\n4.1 Deploying Treasury...");
            const Treasury = await ethers.getContractFactory("TolaniTreasury");
            const treasury = await Treasury.deploy(deployed.Timelock);
            await treasury.waitForDeployment();
            deployed.Treasury = await treasury.getAddress();
            console.log(`   ✅ Treasury: ${deployed.Treasury}`);
        }

        // ========================================
        // PHASE 5: DeFi (Optional - can skip if low on ETH)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("📦 PHASE 5: DeFi Components");
        console.log("=".repeat(50));

        // Deploy Staking (or use existing)
        if (DEPLOYED.Staking) {
            console.log("\n5.1 Using Previously Deployed StakingPool...");
            deployed.Staking = DEPLOYED.Staking;
            console.log(`   ✅ StakingPool: ${deployed.Staking}`);
        } else {
            console.log("\n5.1 Deploying StakingPool...");
            // Wait for nonce to settle first
            await new Promise(resolve => setTimeout(resolve, 10000));
            const Staking = await ethers.getContractFactory("StakingPool");
            const staking = await Staking.deploy(
                deployed.TUT,  // stakingToken
                deployed.TUT   // rewardsToken (same token)
            );
            await staking.waitForDeployment();
            deployed.Staking = await staking.getAddress();
            console.log(`   ✅ StakingPool: ${deployed.Staking}`);
        }

        // ========================================
        // PHASE 6: Configuration
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("⚙️  PHASE 6: Configuration");
        console.log("=".repeat(50));

        // Setup uTUT roles
        console.log("\n6.1 Setting up uTUT roles...");
        const uTUT = await ethers.getContractAt("uTUTSimple", deployed.uTUT);
        const MINTER_ROLE = await uTUT.MINTER_ROLE();
        await (await uTUT.grantRole(MINTER_ROLE, deployed.TrainingRewards)).wait();
        console.log(`   ✅ Granted MINTER_ROLE to TrainingRewards`);

        // Setup Timelock roles
        console.log("\n6.2 Setting up Timelock roles...");
        const timelockContract = await ethers.getContractAt("TolaniTimelock", deployed.Timelock);
        const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await timelockContract.EXECUTOR_ROLE();
        
        await (await timelockContract.grantRole(PROPOSER_ROLE, deployed.Governor)).wait();
        await (await timelockContract.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress)).wait(); // Anyone can execute
        console.log(`   ✅ Timelock roles configured`);

        // ========================================
        // Save Deployment
        // ========================================
        const deploymentData = {
            network: "base-mainnet",
            chainId: Number(network.chainId),
            timestamp: Date.now(),
            deployer: deployer.address,
            contracts: deployed,
            config: {
                stakingRewardRate: CONFIG.stakingRewardRate.toString(),
                timelockDelay: "48 hours",
                uniswapV3: UNISWAP_V3_BASE
            }
        };

        const filename = `deployments/base-mainnet-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log("\n" + "=".repeat(70));
        console.log("  🎉 BASE MAINNET DEPLOYMENT COMPLETE!");
        console.log("=".repeat(70));
        console.log(`\n⏱️  Total time: ${elapsed} seconds`);
        console.log(`\n📄 Deployment saved to: ${filename}`);
        
        console.log("\n📋 Contract Addresses:");
        console.log("-".repeat(50));
        for (const [name, address] of Object.entries(deployed)) {
            console.log(`   ${name.padEnd(20)} ${address}`);
        }
        
        console.log("\n🔗 BaseScan Links:");
        console.log("-".repeat(50));
        for (const [name, address] of Object.entries(deployed)) {
            console.log(`   ${name}: https://basescan.org/address/${address}`);
        }

        console.log("\n📝 Next Steps:");
        console.log("   1. Verify contracts on BaseScan");
        console.log("   2. Transfer admin to Gnosis Safe");
        console.log("   3. Fund Treasury");
        console.log("   4. Create training campaigns");

    } catch (error) {
        console.log(`\n❌ DEPLOYMENT FAILED: ${error.message}`);
        console.log("\nPartially deployed contracts:");
        for (const [name, address] of Object.entries(deployed)) {
            console.log(`   ${name}: ${address}`);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
