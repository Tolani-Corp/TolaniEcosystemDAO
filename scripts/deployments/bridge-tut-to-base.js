/**
 * Bridge TUT from Ethereum L1 to Base L2
 * 
 * Uses the Base Native Bridge to transfer TUT tokens from Sepolia to Base Sepolia
 * (or Mainnet to Base Mainnet)
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/bridge-tut-to-base.js --network sepolia
 *   npx hardhat run scripts/deployments/bridge-tut-to-base.js --network mainnet
 */

const { ethers } = require("hardhat");

// L1 Standard Bridge addresses
const L1_STANDARD_BRIDGE = {
    sepolia: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
    mainnet: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35"
};

// TUT Token addresses on L1
const L1_TUT_TOKEN = {
    sepolia: "0xDA460231C53Fe2EC9F4E47FA58387FF7DeD1680B",
    mainnet: process.env.L1_TUT_TOKEN_ADDRESS || ""
};

// Amount to bridge (adjust as needed)
const BRIDGE_AMOUNT = ethers.parseUnits("1000000", 18); // 1M TUT for initial liquidity

// L1 Standard Bridge ABI (minimal)
const L1_BRIDGE_ABI = [
    "function depositERC20(address _l1Token, address _l2Token, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external",
    "function depositERC20To(address _l1Token, address _l2Token, address _to, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external"
];

// ERC20 ABI for approval
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)"
];

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  BRIDGE TUT TOKEN: L1 → BASE L2");
    console.log("=".repeat(70) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    // Determine network
    let networkType;
    if (chainId === 1) {
        networkType = "mainnet";
    } else if (chainId === 11155111) {
        networkType = "sepolia";
    } else {
        console.log("❌ ERROR: Unsupported network. Use sepolia or mainnet.");
        return;
    }

    console.log("📋 Bridge Info:");
    console.log(`   Network: ${networkType} (${chainId})`);
    console.log(`   Deployer: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    const bridgeAddress = L1_STANDARD_BRIDGE[networkType];
    const tutAddress = L1_TUT_TOKEN[networkType];

    if (!tutAddress) {
        console.log("❌ ERROR: TUT token address not configured for", networkType);
        return;
    }

    console.log(`   L1 Bridge: ${bridgeAddress}`);
    console.log(`   L1 TUT Token: ${tutAddress}`);
    console.log(`   Amount to Bridge: ${ethers.formatUnits(BRIDGE_AMOUNT, 18)} TUT\n`);

    // Connect to contracts
    const tutToken = new ethers.Contract(tutAddress, ERC20_ABI, deployer);
    const bridge = new ethers.Contract(bridgeAddress, L1_BRIDGE_ABI, deployer);

    // Check TUT balance
    const tutBalance = await tutToken.balanceOf(deployer.address);
    console.log(`📊 TUT Balance: ${ethers.formatUnits(tutBalance, 18)} TUT`);

    if (tutBalance < BRIDGE_AMOUNT) {
        console.log(`❌ ERROR: Insufficient TUT balance. Have ${ethers.formatUnits(tutBalance, 18)}, need ${ethers.formatUnits(BRIDGE_AMOUNT, 18)}`);
        return;
    }

    // Check current allowance
    const currentAllowance = await tutToken.allowance(deployer.address, bridgeAddress);
    console.log(`📊 Current Allowance: ${ethers.formatUnits(currentAllowance, 18)} TUT\n`);

    // Step 1: Approve bridge to spend TUT
    if (currentAllowance < BRIDGE_AMOUNT) {
        console.log("-".repeat(50));
        console.log("📦 Step 1: Approving L1 Bridge to spend TUT...\n");

        const approveTx = await tutToken.approve(bridgeAddress, BRIDGE_AMOUNT);
        console.log(`   Tx Hash: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("   ✅ Approval confirmed!\n");
    } else {
        console.log("   ✅ Sufficient allowance already granted\n");
    }

    // Step 2: Bridge TUT to Base
    console.log("-".repeat(50));
    console.log("📦 Step 2: Bridging TUT to Base L2...\n");

    // For the L2 token address, we use address(0) for new deployments
    // The bridge will create a representation on L2
    // For already bridged tokens, use the L2 token address
    const l2TokenAddress = ethers.ZeroAddress; // New token - bridge will create L2 representation

    const minGasLimit = 200000; // Gas limit for L2 execution
    const extraData = "0x"; // No extra data

    try {
        const bridgeTx = await bridge.depositERC20(
            tutAddress,      // L1 token
            l2TokenAddress,  // L2 token (0x0 for new)
            BRIDGE_AMOUNT,   // Amount
            minGasLimit,     // Min gas limit on L2
            extraData        // Extra data
        );

        console.log(`   Tx Hash: ${bridgeTx.hash}`);
        console.log(`   View on Etherscan: https://${networkType === 'sepolia' ? 'sepolia.' : ''}etherscan.io/tx/${bridgeTx.hash}`);
        
        const receipt = await bridgeTx.wait();
        console.log(`   ✅ Bridge transaction confirmed! Block: ${receipt.blockNumber}\n`);

        // Instructions for next steps
        console.log("=".repeat(70));
        console.log("  BRIDGE INITIATED - NEXT STEPS");
        console.log("=".repeat(70));
        console.log(`
⏳ Wait for bridge finalization:
   - Testnet: ~10-20 minutes
   - Mainnet: ~7 days for full finality (or use fast bridge)

🔍 Track your bridge:
   - Sepolia: https://sepolia-bridge.base.org/
   - Mainnet: https://bridge.base.org/

📋 After bridge completes:
   1. Find the L2 TUT token address on Base
      - Check Base block explorer for the deposit event
      - Or use: https://sepolia.basescan.org/

   2. Update .env with bridged address:
      BASE_TUT_ADDRESS=0x... (the L2 token address)

   3. Deploy remaining contracts on Base:
      npx hardhat run scripts/deployments/deploy-mainnet.js --network ${networkType === 'sepolia' ? 'baseSepolia' : 'base'}

📝 Bridge Details:
   - L1 Token: ${tutAddress}
   - Amount: ${ethers.formatUnits(BRIDGE_AMOUNT, 18)} TUT
   - Recipient: ${deployer.address} (same on L2)
`);

    } catch (error) {
        console.log("❌ Bridge transaction failed:", error.message);
        
        // Common errors
        if (error.message.includes("insufficient")) {
            console.log("\n💡 Tip: Make sure you have enough ETH for gas fees");
        }
        if (error.message.includes("allowance")) {
            console.log("\n💡 Tip: Approval may have failed. Try running again.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
