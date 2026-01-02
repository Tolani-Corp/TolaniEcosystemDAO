// scripts/deployments/create-l2-tut-token.js
// Create OptimismMintableERC20 on Base for TUT bridging
// This preserves the 100M total supply - tokens are locked on L1 and minted on L2

require("dotenv").config();
const { ethers } = require("hardhat");

// L1 TUT on Ethereum Mainnet
const L1_TUT_ADDRESS = "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D";

// OptimismMintableERC20Factory on Base Mainnet  
const FACTORY_ADDRESS = "0xF10122D428B4bc8A9d050D06a2037259b4c4B83B";

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("  📦 Create OptimismMintableERC20 for TUT on Base");
    console.log("=".repeat(50) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    if (Number(network.chainId) !== 8453) {
        console.log("❌ ERROR: Run this on Base mainnet");
        console.log(`   Current: ${network.name} (${network.chainId})`);
        console.log("   Run: npx hardhat run scripts/deployments/create-l2-tut-token.js --network base");
        return;
    }

    console.log(`   Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`   L1 TUT: ${L1_TUT_ADDRESS}`);
    console.log(`   Factory: ${FACTORY_ADDRESS}\n`);

    // OptimismMintableERC20Factory ABI
    const factoryABI = [
        "function createOptimismMintableERC20(address _remoteToken, string memory _name, string memory _symbol) external returns (address)",
        "function createStandardL2Token(address _remoteToken, string memory _name, string memory _symbol) external returns (address)",
        "event OptimismMintableERC20Created(address indexed localToken, address indexed remoteToken, address deployer)",
        "event StandardL2TokenCreated(address indexed remoteToken, address indexed localToken)"
    ];
    
    const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, deployer);
    
    console.log("🔧 Creating OptimismMintableERC20 for TUT...");
    console.log("   Name: TUT Token");
    console.log("   Symbol: TUT");
    console.log("   Remote Token (L1): " + L1_TUT_ADDRESS + "\n");

    try {
        // Try createOptimismMintableERC20 first
        const tx = await factory.createOptimismMintableERC20(
            L1_TUT_ADDRESS,
            "TUT Token",
            "TUT",
            { gasLimit: 2000000 }
        );
        
        console.log(`   TX: ${tx.hash}`);
        console.log(`   Basescan: https://basescan.org/tx/${tx.hash}\n`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 0) {
            console.log("❌ Transaction reverted. Trying createStandardL2Token...\n");
            
            const tx2 = await factory.createStandardL2Token(
                L1_TUT_ADDRESS,
                "TUT Token", 
                "TUT",
                { gasLimit: 2000000 }
            );
            console.log(`   TX: ${tx2.hash}`);
            const receipt2 = await tx2.wait();
            
            if (receipt2.status === 0) {
                console.log("❌ Both methods failed. The factory may have restrictions.");
                return;
            }
        }
        
        console.log(`   ✅ Success! Gas used: ${receipt.gasUsed.toString()}\n`);
        
        // Find the L2 token address from events
        for (const log of receipt.logs) {
            try {
                const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
                if (parsed?.name === "OptimismMintableERC20Created") {
                    const l2Token = parsed.args.localToken;
                    console.log("=".repeat(50));
                    console.log("  🎉 L2 TUT TOKEN CREATED!");
                    console.log("=".repeat(50));
                    console.log(`\n   L2 TUT Address: ${l2Token}`);
                    console.log(`   Basescan: https://basescan.org/address/${l2Token}`);
                    console.log(`\n📝 Add to .env:`);
                    console.log(`   BASE_TUT_ADDRESS=${l2Token}\n`);
                    console.log("📝 Next step - Bridge TUT from L1:");
                    console.log("   npx hardhat run scripts/deployments/bridge-tut-to-base-mainnet.js --network mainnet\n");
                    return l2Token;
                }
            } catch {}
        }
        
        console.log("⚠️  Token created but couldn't parse address from logs.");
        console.log("   Check Basescan for the transaction.");
        
    } catch (error) {
        console.log("❌ Error:", error.message);
        
        if (error.message.includes("revert")) {
            console.log("\n📝 The factory may have restrictions. Possible causes:");
            console.log("   1. Token already exists for this L1 address");
            console.log("   2. Factory requires specific permissions");
            console.log("   3. L1 token needs to be on Superchain Token List first");
        }
    }
}

main().catch(console.error);
