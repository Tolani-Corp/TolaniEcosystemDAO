// scripts/deployments/check-bridge-finalization.js
// Check if the TUT bridge from Ethereum to Base has finalized
// Bridge initiated: January 2, 2026
// Expected finalization: ~January 9, 2026 (7 days)

require("dotenv").config();

async function main() {
    console.log("\n" + "=".repeat(55));
    console.log("  🔍 TUT BRIDGE FINALIZATION CHECKER");
    console.log("=".repeat(55) + "\n");

    const viem = await import('viem');
    const { createPublicClient, http, formatEther } = viem;
    const viemChains = await import('viem/chains');
    const { mainnet, base } = viemChains;

    // Bridge details
    const BRIDGE_TX = "0x9ab57b3727cd0c21b7e734732b42cdf73e007edc8017c9155da2309acfaee428";
    const BRIDGE_BLOCK = 24145387;
    const BRIDGE_DATE = new Date("2026-01-02");
    const EXPECTED_FINALIZATION = new Date(BRIDGE_DATE.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const L1_TUT = process.env.MAINNET_TUT_PROXY || "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D";
    const L2_TUT = process.env.BASE_TUT_ADDRESS || "0xAf7e938741a720508897Bf3a13538f6713A337A4";
    const DEPLOYER = "0xAdBcb3Ba539b741c386d28705858Af699856B928";
    const BRIDGE_AMOUNT = "10000000"; // 10M TUT

    console.log("📋 Bridge Details:");
    console.log(`   Bridge TX: ${BRIDGE_TX}`);
    console.log(`   L1 Block: ${BRIDGE_BLOCK}`);
    console.log(`   Bridge Date: ${BRIDGE_DATE.toDateString()}`);
    console.log(`   Expected Finalization: ~${EXPECTED_FINALIZATION.toDateString()}`);
    console.log(`   Amount: ${BRIDGE_AMOUNT} TUT\n`);

    // Calculate days remaining
    const now = new Date();
    const daysRemaining = Math.ceil((EXPECTED_FINALIZATION - now) / (24 * 60 * 60 * 1000));
    
    if (daysRemaining > 0) {
        console.log(`⏳ Days until expected finalization: ${daysRemaining}`);
    } else {
        console.log("✅ Finalization period has passed! Checking L2 balance...");
    }

    // Create clients
    const publicClientL1 = createPublicClient({
        chain: mainnet,
        transport: http(process.env.ALCHEMY_ETHEREUM_RPC_URL),
    });

    const publicClientL2 = createPublicClient({
        chain: base,
        transport: http("https://mainnet.base.org"),
    });

    // ERC20 ABI
    const erc20ABI = [
        {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
    ];

    // Check L1 balance (should be 90M after bridging 10M)
    console.log("\n📊 L1 Status (Ethereum Mainnet):");
    const l1Balance = await publicClientL1.readContract({
        address: L1_TUT,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [DEPLOYER]
    });
    console.log(`   Your L1 TUT Balance: ${formatEther(l1Balance)} TUT`);

    // Check L2 balance (should be 10M after bridge finalizes)
    console.log("\n📊 L2 Status (Base Mainnet):");
    try {
        const l2Balance = await publicClientL2.readContract({
            address: L2_TUT,
            abi: erc20ABI,
            functionName: 'balanceOf',
            args: [DEPLOYER]
        });
        const l2BalanceNum = Number(formatEther(l2Balance));
        console.log(`   Your L2 TUT Balance: ${formatEther(l2Balance)} TUT`);

        if (l2BalanceNum >= 10000000) {
            console.log("\n" + "=".repeat(55));
            console.log("  🎉 BRIDGE FINALIZED! TUT HAS ARRIVED ON BASE!");
            console.log("=".repeat(55));
            console.log(`
✅ You now have ${formatEther(l2Balance)} TUT on Base Mainnet!

📝 Next Steps:
   1. Deploy the ecosystem:
      npx hardhat run scripts/deployments/deploy-mainnet.js --network base
   
   2. Transfer admin to Gnosis Safe:
      npx hardhat run scripts/deployments/transfer-to-multisig.js --network base
`);
            return true;
        } else {
            console.log(`   ⏳ Waiting for bridge finalization...`);
            console.log(`   Expected: ${BRIDGE_AMOUNT} TUT | Current: ${formatEther(l2Balance)} TUT`);
        }
    } catch (error) {
        console.log(`   ⏳ L2 token not yet active or balance is 0`);
        console.log(`   Error: ${error.message}`);
    }

    console.log("\n" + "-".repeat(55));
    console.log("🔗 Links:");
    console.log(`   L1 Bridge TX: https://etherscan.io/tx/${BRIDGE_TX}`);
    console.log(`   L2 TUT Token: https://basescan.org/address/${L2_TUT}`);
    console.log(`   Your L2 Wallet: https://basescan.org/address/${DEPLOYER}#tokentxns`);
    console.log("-".repeat(55));
    
    console.log(`
📅 Reminder: Run this script again after ${EXPECTED_FINALIZATION.toDateString()}
   Command: node scripts/deployments/check-bridge-finalization.js
`);
    return false;
}

main().catch(console.error);
