/**
 * Check Bridged TUT Token on Base L2
 * 
 * Finds the L2 token address after bridging from L1
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/check-bridged-tut.js --network baseSepolia
 */

const { ethers } = require("hardhat");

// L1 TUT Token address
const L1_TUT_ADDRESS = "0xDA460231C53Fe2EC9F4E47FA58387FF7DeD1680B";

// L2 Standard Bridge (to query for token mapping)
const L2_STANDARD_BRIDGE = {
    baseSepolia: "0x4200000000000000000000000000000000000010",
    base: "0x4200000000000000000000000000000000000010"
};

// OptimismMintableERC20Factory - creates L2 tokens
const L2_TOKEN_FACTORY = {
    baseSepolia: "0x4200000000000000000000000000000000000012",
    base: "0x4200000000000000000000000000000000000012"
};

// Factory ABI for querying deployed tokens
const FACTORY_ABI = [
    "event OptimismMintableERC20Created(address indexed localToken, address indexed remoteToken, address deployer)",
    "function BRIDGE() external view returns (address)"
];

// ERC20 ABI
const ERC20_ABI = [
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function totalSupply() external view returns (uint256)",
    "function balanceOf(address) external view returns (uint256)"
];

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  CHECK BRIDGED TUT TOKEN ON BASE L2");
    console.log("=".repeat(70) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let networkType;
    if (chainId === 84532) {
        networkType = "baseSepolia";
    } else if (chainId === 8453) {
        networkType = "base";
    } else {
        console.log("❌ ERROR: Run this on baseSepolia or base network");
        return;
    }

    console.log("📋 Network Info:");
    console.log(`   Network: ${networkType} (${chainId})`);
    console.log(`   Checking for: ${deployer.address}\n`);

    const factoryAddress = L2_TOKEN_FACTORY[networkType];
    console.log(`   L2 Token Factory: ${factoryAddress}`);
    console.log(`   L1 TUT Token: ${L1_TUT_ADDRESS}\n`);

    // Method 1: Check for common bridged token pattern
    // The L2 token address is often deterministic based on L1 token
    console.log("-".repeat(50));
    console.log("🔍 Searching for bridged TUT token...\n");

    // Query factory events for our L1 token
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, deployer);
    
    try {
        // Look for OptimismMintableERC20Created events with our L1 token
        const filter = factory.filters.OptimismMintableERC20Created(null, L1_TUT_ADDRESS);
        const events = await factory.queryFilter(filter, -10000); // Last 10k blocks

        if (events.length > 0) {
            const l2TokenAddress = events[0].args.localToken;
            console.log(`   ✅ Found bridged TUT token!\n`);
            console.log(`   L2 TUT Address: ${l2TokenAddress}`);

            // Get token details
            const l2Token = new ethers.Contract(l2TokenAddress, ERC20_ABI, deployer);
            const name = await l2Token.name();
            const symbol = await l2Token.symbol();
            const decimals = await l2Token.decimals();
            const totalSupply = await l2Token.totalSupply();
            const balance = await l2Token.balanceOf(deployer.address);

            console.log(`\n📊 Token Details:`);
            console.log(`   Name: ${name}`);
            console.log(`   Symbol: ${symbol}`);
            console.log(`   Decimals: ${decimals}`);
            console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
            console.log(`   Your Balance: ${ethers.formatUnits(balance, decimals)}`);

            console.log(`\n📝 Add to .env:`);
            console.log(`   BASE_TUT_ADDRESS=${l2TokenAddress}`);

            return l2TokenAddress;
        } else {
            console.log("   ⏳ No bridged token found yet.");
            console.log("   The bridge may still be processing (~10-20 min on testnet).\n");
            console.log("   Try again in a few minutes, or check:");
            console.log(`   https://sepolia.basescan.org/address/${deployer.address}#tokentxns`);
        }
    } catch (error) {
        console.log("   ⚠️ Could not query factory events:", error.message);
    }

    // Method 2: Check deployer's token transfers
    console.log("\n-".repeat(50));
    console.log("🔍 Checking your recent token transfers...\n");

    try {
        // Check ETH balance on L2
        const ethBalance = await ethers.provider.getBalance(deployer.address);
        console.log(`   L2 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

        // If no ETH on L2, bridge hasn't arrived yet
        if (ethBalance === 0n) {
            console.log("\n   💡 You may need ETH on Base to see token balances.");
            console.log("   Bridge some Sepolia ETH first: https://bridge.base.org/");
        }
    } catch (error) {
        console.log("   Error checking balances:", error.message);
    }

    console.log("\n" + "=".repeat(70));
    console.log("  NEXT STEPS");
    console.log("=".repeat(70));
    console.log(`
If bridge is still processing:
1. Wait 10-20 minutes
2. Run this script again

If bridge completed but token not found:
1. Check Base Sepolia explorer manually:
   https://sepolia.basescan.org/address/${deployer.address}#tokentxns

2. Look for the incoming TUT transfer
3. Copy the token contract address
4. Update .env: BASE_TUT_ADDRESS=0x...

5. Then deploy ecosystem contracts:
   npx hardhat run scripts/deployments/deploy-mainnet.js --network baseSepolia
`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
