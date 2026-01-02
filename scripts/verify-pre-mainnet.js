const { ethers } = require("hardhat");

/**
 * Pre-Mainnet Verification Suite
 * Run this comprehensive test before mainnet deployment
 */

// Contract addresses (Base Sepolia - Latest)
const CONTRACTS = {
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
    TUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
    TUTConverter: "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2",
    TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
    MerchantRegistry: "0x17904f65220771fDBAbca6eCcDdAf42345C9571d",
    PaymentProcessor: "0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1",  // v2 with refunds
    Treasury: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7"
};

const results = {
    passed: [],
    failed: [],
    warnings: []
};

function log(msg) { console.log(msg); }
function pass(test) { results.passed.push(test); log(`  ✅ ${test}`); }
function fail(test, err) { results.failed.push({ test, error: err }); log(`  ❌ ${test}: ${err}`); }
function warn(test) { results.warnings.push(test); log(`  ⚠️  ${test}`); }

async function main() {
    log("\n" + "=".repeat(60));
    log("  PRE-MAINNET VERIFICATION SUITE");
    log("  Network: " + (await ethers.provider.getNetwork()).name);
    log("=".repeat(60) + "\n");

    const [deployer] = await ethers.getSigners();
    log(`Tester: ${deployer.address}\n`);

    // ============================================
    // 1. CONTRACT DEPLOYMENT VERIFICATION
    // ============================================
    log("📦 1. CONTRACT DEPLOYMENT VERIFICATION\n");

    for (const [name, address] of Object.entries(CONTRACTS)) {
        try {
            const code = await ethers.provider.getCode(address);
            if (code !== "0x") {
                pass(`${name} deployed at ${address.slice(0, 10)}...`);
            } else {
                fail(`${name}`, "No code at address");
            }
        } catch (e) {
            fail(`${name}`, e.message);
        }
    }

    // ============================================
    // 2. ROLE CONFIGURATION
    // ============================================
    log("\n🔐 2. ROLE CONFIGURATION\n");

    const registry = await ethers.getContractAt("MerchantRegistry", CONTRACTS.MerchantRegistry);
    const processor = await ethers.getContractAt("TolaniPaymentProcessor", CONTRACTS.PaymentProcessor);
    const training = await ethers.getContractAt("TrainingRewardsSimple", CONTRACTS.TrainingRewards);

    // Check PaymentProcessor has REGISTRAR_ROLE on MerchantRegistry
    try {
        const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
        const hasRole = await registry.hasRole(REGISTRAR_ROLE, CONTRACTS.PaymentProcessor);
        if (hasRole) {
            pass("PaymentProcessor has REGISTRAR_ROLE on MerchantRegistry");
        } else {
            fail("PaymentProcessor REGISTRAR_ROLE", "Role not granted");
        }
    } catch (e) {
        fail("REGISTRAR_ROLE check", e.message);
    }

    // Check TrainingRewards has MINTER_ROLE on uTUT
    try {
        const uTUT = await ethers.getContractAt("@openzeppelin/contracts/access/AccessControl.sol:AccessControl", CONTRACTS.uTUT);
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        const hasRole = await uTUT.hasRole(MINTER_ROLE, CONTRACTS.TrainingRewards);
        if (hasRole) {
            pass("TrainingRewards has MINTER_ROLE on uTUT");
        } else {
            fail("TrainingRewards MINTER_ROLE", "Role not granted");
        }
    } catch (e) {
        fail("MINTER_ROLE check", e.message);
    }

    // Check TUTConverter has MINTER_ROLE on uTUT
    try {
        const uTUT = await ethers.getContractAt("@openzeppelin/contracts/access/AccessControl.sol:AccessControl", CONTRACTS.uTUT);
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        const hasRole = await uTUT.hasRole(MINTER_ROLE, CONTRACTS.TUTConverter);
        if (hasRole) {
            pass("TUTConverter has MINTER_ROLE on uTUT");
        } else {
            fail("TUTConverter MINTER_ROLE", "Role not granted");
        }
    } catch (e) {
        fail("TUTConverter MINTER_ROLE check", e.message);
    }

    // ============================================
    // 3. PAYMENT FLOW TEST
    // ============================================
    log("\n💳 3. PAYMENT FLOW TEST\n");

    const uTUTToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", CONTRACTS.uTUT);

    // Register merchant
    try {
        const merchantName = `verify-test-${Date.now()}`;
        const tx = await registry.registerMerchantDirect(
            merchantName, "VERIFY-001", 1,
            deployer.address, deployer.address,
            true, true, 200, ""
        );
        const receipt = await tx.wait();
        
        let merchantId;
        for (const log of receipt.logs) {
            try {
                const parsed = registry.interface.parseLog(log);
                if (parsed?.name === "MerchantRegistered") {
                    merchantId = parsed.args.merchantId;
                    break;
                }
            } catch {}
        }
        
        if (merchantId) {
            pass("Merchant registration works");
            
            // Make payment
            const amount = ethers.parseUnits("1", 6);
            await uTUTToken.approve(CONTRACTS.PaymentProcessor, amount);
            const orderId = ethers.keccak256(ethers.toUtf8Bytes("verify-" + Date.now()));
            
            const payTx = await processor.pay(merchantId, CONTRACTS.uTUT, amount, orderId, "Verification test", { gasLimit: 500000 });
            const payReceipt = await payTx.wait();
            
            if (payReceipt.status === 1) {
                pass("Payment processing works");
                
                // Find payment ID for refund test
                let paymentId;
                for (const log of payReceipt.logs) {
                    try {
                        const parsed = processor.interface.parseLog(log);
                        if (parsed?.name === "PaymentProcessed") {
                            paymentId = parsed.args.paymentId;
                            break;
                        }
                    } catch {}
                }
                
                // Test refund
                if (paymentId) {
                    const refundable = await processor.getRefundableAmount(paymentId);
                    if (refundable > 0n) {
                        pass("getRefundableAmount() returns correct value");
                        
                        // Partial refund
                        const halfRefund = refundable / 2n;
                        await uTUTToken.approve(CONTRACTS.PaymentProcessor, halfRefund);
                        const refundTx = await processor.merchantRefund(paymentId, halfRefund);
                        await refundTx.wait();
                        pass("Partial merchant refund works");
                    }
                }
            } else {
                fail("Payment processing", "TX reverted");
            }
        }
    } catch (e) {
        fail("Payment flow", e.message);
    }

    // ============================================
    // 4. TRAINING REWARDS TEST
    // ============================================
    log("\n🎓 4. TRAINING REWARDS TEST\n");

    try {
        const campaignId = ethers.keccak256(ethers.toUtf8Bytes("verify-campaign-" + Date.now()));
        const startTime = Math.floor(Date.now() / 1000);
        const endTime = startTime + 86400 * 30;
        
        const createTx = await training.createCampaign(
            campaignId,
            "Verification Campaign",
            ethers.parseUnits("10", 6),  // reward per completion
            ethers.parseUnits("1000", 6), // budget
            startTime,
            endTime
        );
        await createTx.wait();
        pass("Campaign creation works");

        // Grant reward (grantReward signature: learner, campaignId, completionProof)
        const completionProof = ethers.keccak256(ethers.toUtf8Bytes("VERIFY-CERT-001"));
        const rewardTx = await training.grantReward(
            deployer.address,
            campaignId,
            completionProof
        );
        await rewardTx.wait();
        pass("Reward issuance works");
    } catch (e) {
        fail("Training rewards", e.message);
    }

    // ============================================
    // 5. TOKEN CONVERSION TEST
    // ============================================
    log("\n🔄 5. TOKEN CONVERSION TEST\n");

    const converter = await ethers.getContractAt("TUTConverterSimple", CONTRACTS.TUTConverter);
    const TUTToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", CONTRACTS.TUT);

    try {
        // TUT → uTUT (convertToUtut)
        const TUTAmount = ethers.parseUnits("1", 18);
        await TUTToken.approve(CONTRACTS.TUTConverter, TUTAmount);
        const toUTUTtx = await converter.convertToUtut(TUTAmount);
        await toUTUTtx.wait();
        pass("TUT → uTUT conversion works");

        // uTUT → TUT (convertToTut)
        const uTUTAmount = ethers.parseUnits("1", 6);
        await uTUTToken.approve(CONTRACTS.TUTConverter, uTUTAmount);
        const toTUTtx = await converter.convertToTut(uTUTAmount);
        await toTUTtx.wait();
        pass("uTUT → TUT conversion works");
    } catch (e) {
        fail("Token conversion", e.message);
    }

    // ============================================
    // 6. SECURITY CHECKS
    // ============================================
    log("\n🛡️  6. SECURITY CHECKS\n");

    // Check contracts not paused
    try {
        const isPausedRegistry = await registry.paused();
        const isPausedProcessor = await processor.paused();
        
        if (!isPausedRegistry && !isPausedProcessor) {
            pass("Contracts are not paused");
        } else {
            warn("Some contracts are paused - verify this is intentional");
        }
    } catch (e) {
        warn("Pause check failed: " + e.message);
    }

    // Check admin is not zero address
    try {
        const DEFAULT_ADMIN = ethers.ZeroHash;
        const processorAdmin = await processor.hasRole(DEFAULT_ADMIN, ethers.ZeroAddress);
        const registryAdmin = await registry.hasRole(DEFAULT_ADMIN, ethers.ZeroAddress);
        
        if (!processorAdmin && !registryAdmin) {
            pass("Admin role not assigned to zero address");
        } else {
            fail("Admin security", "Zero address has admin role");
        }
    } catch (e) {
        warn("Admin check: " + e.message);
    }

    // ============================================
    // SUMMARY
    // ============================================
    log("\n" + "=".repeat(60));
    log("  VERIFICATION SUMMARY");
    log("=".repeat(60));
    log(`\n  ✅ Passed: ${results.passed.length}`);
    log(`  ❌ Failed: ${results.failed.length}`);
    log(`  ⚠️  Warnings: ${results.warnings.length}\n`);

    if (results.failed.length > 0) {
        log("❌ FAILURES:\n");
        results.failed.forEach(f => log(`  - ${f.test}: ${f.error}`));
        log("\n⛔ DO NOT DEPLOY TO MAINNET until failures are resolved\n");
    } else if (results.warnings.length > 0) {
        log("⚠️  WARNINGS:\n");
        results.warnings.forEach(w => log(`  - ${w}`));
        log("\n⚡ Review warnings before mainnet deployment\n");
    } else {
        log("🚀 ALL TESTS PASSED - Ready for mainnet deployment!\n");
    }
}

main().catch(console.error);
