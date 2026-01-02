const { ethers } = require("hardhat");

async function main() {
    console.log("\\n=== Redeploying TolaniPaymentProcessor (v2 - Merchant Refunds) ===\\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Existing contracts
    const uTUT = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";
    const TUT = "0x05AbCD77f178cF43E561091f263Eaa66353Dce87";  // MockBridgedTUT
    const merchantRegistry = "0x17904f65220771fDBAbca6eCcDdAf42345C9571d";
    const feeCollector = "0xC12035B044c5988E9977E50bA0913AEF4eec28F7";  // Treasury
    const admin = deployer.address;
    
    console.log("\\nDeploying with:");
    console.log("  uTUT:", uTUT);
    console.log("  TUT:", TUT);
    console.log("  MerchantRegistry:", merchantRegistry);
    console.log("  FeeCollector:", feeCollector);
    console.log("  Admin:", admin);
    
    // Deploy
    const PaymentProcessor = await ethers.getContractFactory("TolaniPaymentProcessor");
    const processor = await PaymentProcessor.deploy(
        uTUT,
        TUT,
        merchantRegistry,
        feeCollector,
        admin
    );
    
    await processor.waitForDeployment();
    const address = await processor.getAddress();
    
    console.log("\\n✅ TolaniPaymentProcessor deployed to:", address);
    
    // Grant REGISTRAR_ROLE on MerchantRegistry
    console.log("\\n📝 Granting REGISTRAR_ROLE on MerchantRegistry...");
    const registry = await ethers.getContractAt("MerchantRegistry", merchantRegistry);
    const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
    
    const tx = await registry.grantRole(REGISTRAR_ROLE, address);
    await tx.wait();
    console.log("   ✅ REGISTRAR_ROLE granted");
    
    // Verify role
    const hasRole = await registry.hasRole(REGISTRAR_ROLE, address);
    console.log("   Verified:", hasRole);
    
    console.log("\\n=== Deployment Complete ===");
    console.log("\\nUpdate your .env with:");
    console.log(`PAYMENT_PROCESSOR_ADDRESS=${address}`);
}

main().catch(console.error);
