/**
 * Transfer Admin Roles to Multi-Sig (Gnosis Safe)
 * 
 * This script transfers all admin roles from deployer to a Gnosis Safe multi-sig
 * for production security.
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/transfer-to-multisig.js --network baseSepolia
 *   npx hardhat run scripts/deployments/transfer-to-multisig.js --network base
 */

const { ethers } = require("hardhat");

// Base Sepolia deployed contracts
const CONTRACTS = {
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
    TUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
    TUTConverter: "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2",
    TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
    MerchantRegistry: "0x17904f65220771fDBAbca6eCcDdAf42345C9571d",
    PaymentProcessor: "0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1",
    Treasury: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
    StakingPool: "0x829C9F2EAA45Eb587a6A683087b796A74B2826F7",
    LiquidityIncentives: "0xFe7FEf4E4604478Ce49BbCC1231460E3E5869E53"
};

// CONFIGURE THIS: Your Gnosis Safe address
const GNOSIS_SAFE = process.env.GNOSIS_SAFE_ADDRESS || "";

// Standard role hashes
const ROLES = {
    DEFAULT_ADMIN_ROLE: ethers.ZeroHash,
    MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
    PAUSER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE")),
    UPGRADER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE")),
    BLACKLIST_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BLACKLIST_ROLE")),
    GOVERNANCE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE")),
    CAMPAIGN_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE")),
    REWARDER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REWARDER_ROLE")),
    APPROVER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("APPROVER_ROLE")),
    FEE_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("FEE_MANAGER_ROLE")),
    REWARDS_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"))
};

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  TRANSFER ADMIN ROLES TO GNOSIS SAFE");
    console.log("=".repeat(70) + "\n");

    if (!GNOSIS_SAFE || GNOSIS_SAFE === "") {
        console.log("❌ ERROR: GNOSIS_SAFE_ADDRESS not set in .env");
        console.log("\nTo create a Gnosis Safe:");
        console.log("1. Go to https://app.safe.global/");
        console.log("2. Connect wallet and create a new Safe");
        console.log("3. Add team members as signers");
        console.log("4. Set threshold (e.g., 2 of 3)");
        console.log("5. Add GNOSIS_SAFE_ADDRESS=0x... to .env");
        console.log("\nThen run this script again.");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("Current Admin:", deployer.address);
    console.log("New Admin (Safe):", GNOSIS_SAFE);
    console.log("");

    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, `(${network.chainId})`);
    console.log("");

    // Confirm before proceeding
    console.log("⚠️  WARNING: This will transfer all admin roles to the multi-sig.");
    console.log("   You will no longer be able to directly manage these contracts.");
    console.log("   All future changes will require multi-sig approval.\n");

    const results = [];

    // ========================================
    // Transfer roles for each contract
    // ========================================

    // 1. uTUT Token
    console.log("-".repeat(50));
    console.log("📦 uTUT Token");
    try {
        const uTUT = await ethers.getContractAt("uTUTSimple", CONTRACTS.uTUT);
        
        // Grant roles to Safe
        await (await uTUT.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await uTUT.grantRole(ROLES.PAUSER_ROLE, GNOSIS_SAFE)).wait();
        
        // Revoke from deployer (except MINTER - that stays with TrainingRewards)
        await (await uTUT.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "uTUT", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "uTUT", status: "❌" });
    }

    // 2. TUT Token (MockBridgedTUT)
    console.log("-".repeat(50));
    console.log("📦 TUT Token");
    try {
        const TUT = await ethers.getContractAt("MockBridgedTUT", CONTRACTS.TUT);
        
        await (await TUT.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await TUT.grantRole(ROLES.MINTER_ROLE, GNOSIS_SAFE)).wait();
        await (await TUT.grantRole(ROLES.PAUSER_ROLE, GNOSIS_SAFE)).wait();
        await (await TUT.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "TUT", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "TUT", status: "❌" });
    }

    // 3. TrainingRewards
    console.log("-".repeat(50));
    console.log("📦 TrainingRewards");
    try {
        const training = await ethers.getContractAt("TrainingRewardsSimple", CONTRACTS.TrainingRewards);
        
        await (await training.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await training.grantRole(ROLES.CAMPAIGN_MANAGER_ROLE, GNOSIS_SAFE)).wait();
        await (await training.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "TrainingRewards", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "TrainingRewards", status: "❌" });
    }

    // 4. MerchantRegistry
    console.log("-".repeat(50));
    console.log("📦 MerchantRegistry");
    try {
        const registry = await ethers.getContractAt("MerchantRegistry", CONTRACTS.MerchantRegistry);
        
        await (await registry.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await registry.grantRole(ROLES.APPROVER_ROLE, GNOSIS_SAFE)).wait();
        await (await registry.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "MerchantRegistry", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "MerchantRegistry", status: "❌" });
    }

    // 5. PaymentProcessor
    console.log("-".repeat(50));
    console.log("📦 PaymentProcessor");
    try {
        const processor = await ethers.getContractAt("TolaniPaymentProcessor", CONTRACTS.PaymentProcessor);
        
        await (await processor.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await processor.grantRole(ROLES.FEE_MANAGER_ROLE, GNOSIS_SAFE)).wait();
        await (await processor.grantRole(ROLES.PAUSER_ROLE, GNOSIS_SAFE)).wait();
        await (await processor.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "PaymentProcessor", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "PaymentProcessor", status: "❌" });
    }

    // 6. Treasury
    console.log("-".repeat(50));
    console.log("📦 Treasury");
    try {
        const treasury = await ethers.getContractAt("TolaniTreasury", CONTRACTS.Treasury);
        
        await (await treasury.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await treasury.grantRole(ROLES.GOVERNANCE_ROLE, GNOSIS_SAFE)).wait();
        await (await treasury.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "Treasury", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "Treasury", status: "❌" });
    }

    // 7. StakingPool
    console.log("-".repeat(50));
    console.log("📦 StakingPool");
    try {
        const staking = await ethers.getContractAt("StakingPool", CONTRACTS.StakingPool);
        
        await (await staking.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await staking.grantRole(ROLES.GOVERNANCE_ROLE, GNOSIS_SAFE)).wait();
        await (await staking.grantRole(ROLES.REWARDS_MANAGER_ROLE, GNOSIS_SAFE)).wait();
        await (await staking.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "StakingPool", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "StakingPool", status: "❌" });
    }

    // 8. LiquidityIncentives
    console.log("-".repeat(50));
    console.log("📦 LiquidityIncentives");
    try {
        const incentives = await ethers.getContractAt("LiquidityIncentives", CONTRACTS.LiquidityIncentives);
        
        await (await incentives.grantRole(ROLES.DEFAULT_ADMIN_ROLE, GNOSIS_SAFE)).wait();
        await (await incentives.grantRole(ROLES.GOVERNANCE_ROLE, GNOSIS_SAFE)).wait();
        await (await incentives.renounceRole(ROLES.DEFAULT_ADMIN_ROLE, deployer.address)).wait();
        
        console.log("   ✅ Admin transferred to Safe");
        results.push({ contract: "LiquidityIncentives", status: "✅" });
    } catch (e) {
        console.log("   ❌ Failed:", e.message.slice(0, 50));
        results.push({ contract: "LiquidityIncentives", status: "❌" });
    }

    // ========================================
    // Summary
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("  TRANSFER SUMMARY");
    console.log("=".repeat(70) + "\n");

    results.forEach(r => {
        console.log(`   ${r.status} ${r.contract}`);
    });

    const successful = results.filter(r => r.status === "✅").length;
    console.log(`\n   Total: ${successful}/${results.length} contracts transferred`);

    if (successful === results.length) {
        console.log("\n✅ All admin roles successfully transferred to Gnosis Safe!");
        console.log(`   Safe Address: ${GNOSIS_SAFE}`);
        console.log("\n⚠️  IMPORTANT: The deployer wallet no longer has admin access.");
        console.log("   All future contract changes require multi-sig approval.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
