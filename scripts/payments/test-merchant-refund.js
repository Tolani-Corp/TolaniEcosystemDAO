const { ethers } = require("hardhat");

async function main() {
    console.log("\n=== Testing Merchant Refund Functionality ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Tester:", deployer.address);
    
    // Contract addresses
    const PAYMENT_PROCESSOR = "0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1";
    const uTUT = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";
    const MERCHANT_REGISTRY = "0x17904f65220771fDBAbca6eCcDdAf42345C9571d";
    
    // Get contracts
    const processor = await ethers.getContractAt("TolaniPaymentProcessor", PAYMENT_PROCESSOR);
    const token = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", uTUT);
    const registry = await ethers.getContractAt("MerchantRegistry", MERCHANT_REGISTRY);
    
    // Generate a random wallet for the merchant
    const merchantWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    console.log("Created merchant wallet:", merchantWallet.address);
    
    console.log("\n1️⃣ Registering a test merchant with REGISTRAR...");
    const merchantName = `refund-test-${Date.now()}`;
    
    const registerTx = await registry.registerMerchantDirect(
        merchantName,
        "BIZ-REFUND-001",
        1, // category
        deployer.address, // owner (we control this)
        deployer.address, // payout address (same as owner for easy testing)
        true, // accepts uTUT
        true, // accepts TUT
        200, // 2% fee
        ""
    );
    const registerReceipt = await registerTx.wait();
    
    // Extract merchant ID from event
    let merchantId;
    for (const log of registerReceipt.logs) {
        try {
            const parsed = registry.interface.parseLog(log);
            if (parsed?.name === "MerchantRegistered") {
                merchantId = parsed.args.merchantId || parsed.args[0];
                break;
            }
        } catch {}
    }
    
    if (!merchantId) {
        console.log("   ❌ Could not extract merchantId");
        return;
    }
    console.log("   ✅ Merchant registered:", merchantId);
    
    // Check merchant
    const merchant = await registry.getMerchant(merchantId);
    console.log("   Merchant:", merchant.name);
    console.log("   Owner:", merchant.owner);
    console.log("   Payout:", merchant.payoutAddress);
    console.log("   Status:", merchant.status);
    
    console.log("\n3️⃣ Making a test payment to refund...");
    
    // Approve and pay
    const amount = ethers.parseUnits("1", 6); // 1 uTUT
    const approveTx = await token.approve(PAYMENT_PROCESSOR, amount);
    await approveTx.wait();
    console.log("   ✅ Approved 1 uTUT");
    
    // Make payment (using full signature: merchantId, token, amount, orderId, memo)
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("test-refund-" + Date.now()));
    const payTx = await processor.pay(merchantId, uTUT, amount, orderId, "Test refund payment");
    const receipt = await payTx.wait();
    
    // Get payment ID from event
    const paymentEvent = receipt.logs.find(log => {
        try {
            return processor.interface.parseLog(log)?.name === "PaymentProcessed";
        } catch { return false; }
    });
    
    let paymentId;
    if (paymentEvent) {
        const parsed = processor.interface.parseLog(paymentEvent);
        paymentId = parsed.args.paymentId;
        console.log("   ✅ Payment made, ID:", paymentId);
    } else {
        console.log("   ❌ Could not find payment event");
        return;
    }
    
    console.log("\n4️⃣ Checking payment details...");
    const payment = await processor.getPayment(paymentId);
    console.log("   Amount:", ethers.formatUnits(payment.amount, 6), "uTUT");
    console.log("   Merchant Amount:", ethers.formatUnits(payment.merchantAmount, 6), "uTUT");
    console.log("   Fee:", ethers.formatUnits(payment.fee, 6), "uTUT");
    console.log("   Status:", payment.status);
    console.log("   Refunded Amount:", ethers.formatUnits(payment.refundedAmount, 6), "uTUT");
    
    console.log("\n5️⃣ Checking refundable amount...");
    const refundable = await processor.getRefundableAmount(paymentId);
    console.log("   Refundable:", ethers.formatUnits(refundable, 6), "uTUT");
    
    console.log("\n6️⃣ Testing partial merchant refund (0.5 uTUT)...");
    
    // Merchant needs to approve processor to pull tokens for refund
    const merchantBalance = await token.balanceOf(deployer.address);
    console.log("   Merchant balance:", ethers.formatUnits(merchantBalance, 6), "uTUT");
    
    // Approve processor to pull refund
    const refundAmount = ethers.parseUnits("0.5", 6);
    const approveRefund = await token.approve(PAYMENT_PROCESSOR, refundAmount);
    await approveRefund.wait();
    console.log("   ✅ Approved 0.5 uTUT for refund");
    
    // Execute merchant refund
    try {
        const refundTx = await processor.merchantRefund(paymentId, refundAmount);
        await refundTx.wait();
        console.log("   ✅ Partial refund successful!");
        
        // Check updated payment
        const updatedPayment = await processor.getPayment(paymentId);
        console.log("   New Status:", updatedPayment.status);
        console.log("   Total Refunded:", ethers.formatUnits(updatedPayment.refundedAmount, 6), "uTUT");
        
        const newRefundable = await processor.getRefundableAmount(paymentId);
        console.log("   Remaining Refundable:", ethers.formatUnits(newRefundable, 6), "uTUT");
    } catch (e) {
        console.log("   ❌ Refund failed:", e.message);
    }
    
    console.log("\n=== Test Complete ===\n");
}

main().catch(console.error);
