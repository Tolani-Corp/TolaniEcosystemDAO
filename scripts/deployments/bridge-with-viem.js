// scripts/deployments/bridge-with-viem.js
// Bridge TUT from Ethereum to Base using the official @eth-optimism/viem package

require("dotenv").config();

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("  🌉 Bridge TUT: Ethereum → Base (via viem)");
    console.log("=".repeat(50) + "\n");

    // Dynamic imports for ESM modules
    const viem = await import('viem');
    const { createPublicClient, createWalletClient, http, formatEther, parseEther } = viem;
    const accounts = await import('viem/accounts');
    const { privateKeyToAccount } = accounts;
    const viemChains = await import('viem/chains');
    const { mainnet, base } = viemChains;
    const opActions = await import('@eth-optimism/viem/actions');
    const { depositERC20 } = opActions;

    // Setup account
    const PRIVATE_KEY = process.env.PRIVATE_KEY_DEPLOYER;
    if (!PRIVATE_KEY) {
        console.log("❌ ERROR: PRIVATE_KEY_DEPLOYER not set in .env");
        return;
    }
    const account = privateKeyToAccount(`0x${PRIVATE_KEY.replace('0x', '')}`);
    console.log(`   Deployer: ${account.address}`);

    // Token addresses
    const l1Token = process.env.MAINNET_TUT_PROXY || "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D";
    const l2Token = process.env.BASE_TUT_ADDRESS || "0xAf7e938741a720508897Bf3a13538f6713A337A4";
    console.log(`   L1 TUT: ${l1Token}`);
    console.log(`   L2 TUT: ${l2Token}`);

    // Create clients
    const L1_RPC_URL = process.env.ALCHEMY_ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/VtlxmLrDcQyDrAsRFQlYTkubFKAQOl7Q';
    const L2_RPC_URL = 'https://mainnet.base.org';

    const publicClientL1 = createPublicClient({
        chain: mainnet,
        transport: http(L1_RPC_URL),
    });

    const walletClientL1 = createWalletClient({
        account,
        chain: mainnet,
        transport: http(L1_RPC_URL),
    });

    const publicClientL2 = createPublicClient({
        chain: base,
        transport: http(L2_RPC_URL),
    });

    // Check balances
    const ethBalance = await publicClientL1.getBalance({ address: account.address });
    console.log(`   ETH Balance: ${formatEther(ethBalance)} ETH`);

    // ERC20 ABI for balance and approve
    const erc20ABI = [
        {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
            name: "approve",
            outputs: [{ type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
        },
    ];

    const l1Balance = await publicClientL1.readContract({
        address: l1Token,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [account.address]
    });
    console.log(`   TUT Balance: ${formatEther(l1Balance)} TUT\n`);

    // Amount to bridge: 10M TUT
    const bridgeAmount = parseEther("10000000");

    console.log("⚠️  WARNING: Bridging 10M TUT to Base Mainnet");
    console.log("   This takes ~7 days via the native bridge.");
    console.log("\n   Press Ctrl+C within 10 seconds to cancel...\n");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get bridge address from chain config
    const bridgeAddress = base.contracts?.l1StandardBridge?.[mainnet.id]?.address || "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
    console.log(`   Bridge: ${bridgeAddress}`);

    // Step 1: Approve
    console.log("\n📦 Step 1: Approving TUT for bridge...");
    const approveTx = await walletClientL1.writeContract({
        address: l1Token,
        abi: erc20ABI,
        functionName: 'approve',
        args: [bridgeAddress, bridgeAmount],
    });
    console.log(`   Approval TX: ${approveTx}`);
    await publicClientL1.waitForTransactionReceipt({ hash: approveTx });
    console.log("   ✅ Approved!\n");

    // Step 2: Deposit
    console.log("📦 Step 2: Depositing tokens to L2...");
    const depositTx = await depositERC20(walletClientL1, {
        tokenAddress: l1Token,
        remoteTokenAddress: l2Token,
        amount: bridgeAmount,
        targetChain: base,
        to: account.address,
        minGasLimit: 200000,
    });
    console.log(`   Deposit TX: ${depositTx}`);
    console.log(`   Etherscan: https://etherscan.io/tx/${depositTx}`);

    const depositReceipt = await publicClientL1.waitForTransactionReceipt({ hash: depositTx });
    console.log(`   ✅ Deposit confirmed in block ${depositReceipt.blockNumber}\n`);

    // Check new balances
    const l1BalanceAfter = await publicClientL1.readContract({
        address: l1Token,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [account.address]
    });
    console.log(`   L1 TUT Balance after: ${formatEther(l1BalanceAfter)} TUT`);

    console.log("\n" + "=".repeat(50));
    console.log("  🎉 BRIDGE INITIATED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`
📋 Summary:
   Amount: 10,000,000 TUT
   L1 TX: ${depositTx}
   L2 Token: ${l2Token}

⏳ What's Next:
   1. The bridge takes ~7 days to finalize
   2. After finalization, 10M TUT will appear at:
      https://basescan.org/address/${account.address}#tokentxns
   3. You can then deploy the ecosystem on Base
`);
}

main().catch(console.error);
