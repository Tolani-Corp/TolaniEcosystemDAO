require("dotenv").config();
const { ethers } = require("hardhat");

// All deployed contracts on Base Mainnet
const DEPLOYED = {
    TUT: "0xAf7e938741a720508897Bf3a13538f6713A337A4",
    uTUT: "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4",
    SessionKeyRegistry: "0x73e8fDfE1EEd5f6fbE47Ef9bCEaD76da78516025",
    TUTConverter: "0xF064C89198Ce3c595bf60ac0b6A12045CB49ebeD",
    TrainingRewards: "0x1fec9c4dB67b6d3531171936C13760E2a61415D7",
    Timelock: "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d",
    Governor: "0xeEd65936FaEDb315c598F8b1aF796289BCE2B7f6",
    Treasury: "0x3FaB09377944144eB991DB2a5ADf2C96A5e8587c",
    Staking: "0x21Fc5CD8606e19961F38E26fd7286f7e647eFf04"
};

const GNOSIS_SAFE = "0xa56eb5E3990C740C8c58F02eAD263feF02567677";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("\n" + "=".repeat(70));
    console.log("  TOLANI ECOSYSTEM - BASE MAINNET CONFIGURATION");
    console.log("=".repeat(70));
    console.log(`\n📋 Configuration Info:`);
    console.log(`   Network: ${network.name} (${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Wait a bit to ensure nonce is fresh
    console.log("\n⏳ Waiting 15s for nonce to settle...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // ========================================
    // Step 1: Grant uTUT MINTER_ROLE to TrainingRewards
    // ========================================
    console.log("\n" + "=".repeat(50));
    console.log("⚙️  Step 1: Setup uTUT Roles");
    console.log("=".repeat(50));
    
    try {
        const uTUT = await ethers.getContractAt("uTUTSimple", DEPLOYED.uTUT);
        const MINTER_ROLE = await uTUT.MINTER_ROLE();
        
        // Check if already granted
        const hasRole = await uTUT.hasRole(MINTER_ROLE, DEPLOYED.TrainingRewards);
        if (hasRole) {
            console.log("   ✅ MINTER_ROLE already granted to TrainingRewards");
        } else {
            console.log("   📝 Granting MINTER_ROLE to TrainingRewards...");
            const tx = await uTUT.grantRole(MINTER_ROLE, DEPLOYED.TrainingRewards);
            await tx.wait();
            console.log(`   ✅ Granted MINTER_ROLE to TrainingRewards`);
        }
    } catch (error) {
        console.log(`   ⚠️  uTUT role setup: ${error.message}`);
    }
    
    // Wait between transactions
    console.log("   ⏳ Waiting 15s...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // ========================================
    // Step 2: Setup Timelock Roles
    // ========================================
    console.log("\n" + "=".repeat(50));
    console.log("⚙️  Step 2: Setup Timelock Roles");
    console.log("=".repeat(50));
    
    try {
        const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", DEPLOYED.Timelock);
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        
        // Check and grant PROPOSER_ROLE to Governor
        const govHasProposer = await timelock.hasRole(PROPOSER_ROLE, DEPLOYED.Governor);
        if (govHasProposer) {
            console.log("   ✅ PROPOSER_ROLE already granted to Governor");
        } else {
            console.log("   📝 Granting PROPOSER_ROLE to Governor...");
            const tx = await timelock.grantRole(PROPOSER_ROLE, DEPLOYED.Governor);
            await tx.wait();
            console.log(`   ✅ Granted PROPOSER_ROLE to Governor`);
        }
        
        // Wait between transactions
        console.log("   ⏳ Waiting 15s...");
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Check and grant EXECUTOR_ROLE to anyone (address(0))
        const anyoneCanExecute = await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress);
        if (anyoneCanExecute) {
            console.log("   ✅ EXECUTOR_ROLE already open to anyone");
        } else {
            console.log("   📝 Opening EXECUTOR_ROLE to anyone...");
            const tx = await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
            await tx.wait();
            console.log(`   ✅ EXECUTOR_ROLE open to anyone`);
        }
    } catch (error) {
        console.log(`   ⚠️  Timelock role setup: ${error.message}`);
    }
    
    // Wait between transactions
    console.log("   ⏳ Waiting 15s...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // ========================================
    // Step 3: Transfer Ownership to Safe
    // ========================================
    console.log("\n" + "=".repeat(50));
    console.log("⚙️  Step 3: Transfer Admin to Gnosis Safe");
    console.log("=".repeat(50));
    console.log(`   Safe Address: ${GNOSIS_SAFE}`);
    
    // Transfer uTUT admin
    try {
        const uTUT = await ethers.getContractAt("uTUTSimple", DEPLOYED.uTUT);
        const DEFAULT_ADMIN_ROLE = await uTUT.DEFAULT_ADMIN_ROLE();
        
        const safeHasAdmin = await uTUT.hasRole(DEFAULT_ADMIN_ROLE, GNOSIS_SAFE);
        if (safeHasAdmin) {
            console.log("   ✅ uTUT: Safe already has admin");
        } else {
            console.log("   📝 Granting uTUT admin to Safe...");
            const tx = await uTUT.grantRole(DEFAULT_ADMIN_ROLE, GNOSIS_SAFE);
            await tx.wait();
            console.log(`   ✅ uTUT: Admin granted to Safe`);
        }
    } catch (error) {
        console.log(`   ⚠️  uTUT admin transfer: ${error.message}`);
    }
    
    // ========================================
    // Summary
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("  🎉 BASE MAINNET CONFIGURATION COMPLETE");
    console.log("=".repeat(70));
    
    console.log("\n📋 DEPLOYED CONTRACTS:");
    console.log("=".repeat(50));
    for (const [name, addr] of Object.entries(DEPLOYED)) {
        console.log(`   ${name}: ${addr}`);
    }
    
    console.log("\n🔗 Links:");
    console.log(`   Explorer: https://basescan.org/address/${DEPLOYED.Governor}`);
    
    const finalBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`\n💰 Final Balance: ${ethers.formatEther(finalBalance)} ETH`);
    console.log(`   Spent: ${ethers.formatEther(balance - finalBalance)} ETH\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ CONFIGURATION FAILED:", error.message);
        process.exit(1);
    });
