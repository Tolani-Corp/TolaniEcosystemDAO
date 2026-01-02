/**
 * TUT Token L1 Deployment (Ethereum Mainnet)
 * 
 * Deploys TUTTokenSmartV2 to Ethereum mainnet as the canonical TUT token.
 * After deployment, use Base native bridge to bring TUT to L2.
 * 
 * Prerequisites:
 *   1. Fund deployer wallet with ~0.15 ETH on Ethereum
 *   2. Set ETHEREUM_RPC_URL in .env (Alchemy/Infura)
 *   3. Set ETHERSCAN_API_KEY for verification
 * 
 * Usage:
 *   npx hardhat run scripts/deployments/deploy-l1-tut.js --network mainnet
 *   npx hardhat run scripts/deployments/deploy-l1-tut.js --network sepolia (testnet)
 */

const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// TUT Token Configuration
const CONFIG = {
    name: "Tolani Utility Token",
    symbol: "TUT",
    initialSupply: ethers.parseUnits("100000000", 18), // 100M TUT
    cap: ethers.parseUnits("100000000", 18),           // 100M cap (same as initial)
    
    // ERC2771 Trusted Forwarder (Gelato Relay on mainnet)
    trustedForwarders: {
        mainnet: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c",  // Gelato Relay
        sepolia: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c",  // Gelato Relay
        goerli: "0xE041608922d06a4F26C0d4c27d8bCD01daf1f792"    // OpenZeppelin Defender
    }
};

// Base Bridge addresses
const BASE_BRIDGE = {
    mainnet: {
        l1StandardBridge: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35",
        l1CrossDomainMessenger: "0x866E82a600A1414e583f7F13623F1aC5d58b0Afa"
    },
    sepolia: {
        l1StandardBridge: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
        l1CrossDomainMessenger: "0x58Cc85b8D04EA49cC6DBd3CbFFd00B4B8D6cb3ef"
    }
};

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("  TUT TOKEN - ETHEREUM L1 DEPLOYMENT");
    console.log("=".repeat(70) + "\n");

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log("📋 Deployment Info:");
    console.log(`   Network: ${network.name} (${chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Determine network type
    let networkType;
    if (chainId === 1) {
        networkType = "mainnet";
    } else if (chainId === 11155111) {
        networkType = "sepolia";
    } else if (chainId === 5) {
        networkType = "goerli";
    } else {
        console.log("❌ ERROR: Unsupported network for L1 deployment");
        console.log("   Supported: mainnet (1), sepolia (11155111)");
        return;
    }

    const trustedForwarder = CONFIG.trustedForwarders[networkType] || ethers.ZeroAddress;
    
    console.log(`📦 Token Configuration:`);
    console.log(`   Name: ${CONFIG.name}`);
    console.log(`   Symbol: ${CONFIG.symbol}`);
    console.log(`   Initial Supply: ${ethers.formatUnits(CONFIG.initialSupply, 18)} TUT`);
    console.log(`   Cap: ${ethers.formatUnits(CONFIG.cap, 18)} TUT`);
    console.log(`   Trusted Forwarder: ${trustedForwarder}`);
    console.log("");

    // Safety check for mainnet
    if (chainId === 1) {
        if (balance < ethers.parseEther("0.1")) {
            console.log("❌ ERROR: Insufficient balance. Need at least 0.1 ETH for deployment.");
            return;
        }
        
        console.log("⚠️  WARNING: Deploying to ETHEREUM MAINNET");
        console.log("   This will cost real ETH (~0.06-0.1 ETH at 30 gwei)");
        console.log("   Press Ctrl+C within 10 seconds to cancel...\n");
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    try {
        // ========================================
        // Deploy TUTTokenSmart (UUPS Proxy)
        // ========================================
        console.log("-".repeat(50));
        console.log("📦 Deploying TUTTokenSmart (UUPS Upgradeable)...\n");

        const TUTToken = await ethers.getContractFactory("TUTTokenSmart");
        
        // Deploy as upgradeable proxy
        // Constructor takes: trustedForwarder
        // Initialize takes: owner, initialSupply, cap, forwarder
        // Note: name & symbol are hardcoded constants in the contract
        const tutToken = await upgrades.deployProxy(
            TUTToken,
            [
                deployer.address,    // owner - receives all roles
                CONFIG.initialSupply, // initialSupply
                CONFIG.cap,           // cap (max supply)
                trustedForwarder      // forwarder (must match constructor)
            ],
            { 
                initializer: "initialize",
                kind: "uups",
                constructorArgs: [trustedForwarder]  // Constructor arg for ERC2771
            }
        );
        
        await tutToken.waitForDeployment();
        const proxyAddress = await tutToken.getAddress();
        
        // Get implementation address
        const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        
        console.log(`   ✅ TUT Token Proxy: ${proxyAddress}`);
        console.log(`   ✅ Implementation: ${implAddress}`);

        // Verify initial state
        const totalSupply = await tutToken.totalSupply();
        const deployerBalance = await tutToken.balanceOf(deployer.address);
        const cap = await tutToken.cap();
        
        console.log(`\n📊 Token State:`);
        console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} TUT`);
        console.log(`   Deployer Balance: ${ethers.formatUnits(deployerBalance, 18)} TUT`);
        console.log(`   Cap: ${ethers.formatUnits(cap, 18)} TUT`);

        // Check roles
        const DEFAULT_ADMIN = ethers.ZeroHash;
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
        const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
        const BLACKLIST_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BLACKLIST_ROLE"));

        console.log(`\n🔐 Role Configuration:`);
        console.log(`   DEFAULT_ADMIN: ${await tutToken.hasRole(DEFAULT_ADMIN, deployer.address) ? "✅" : "❌"} ${deployer.address}`);
        console.log(`   MINTER_ROLE: ${await tutToken.hasRole(MINTER_ROLE, deployer.address) ? "✅" : "❌"} ${deployer.address}`);
        console.log(`   PAUSER_ROLE: ${await tutToken.hasRole(PAUSER_ROLE, deployer.address) ? "✅" : "❌"} ${deployer.address}`);
        console.log(`   UPGRADER_ROLE: ${await tutToken.hasRole(UPGRADER_ROLE, deployer.address) ? "✅" : "❌"} ${deployer.address}`);
        console.log(`   BLACKLIST_ROLE: ${await tutToken.hasRole(BLACKLIST_ROLE, deployer.address) ? "✅" : "❌"} ${deployer.address}`);

        // ========================================
        // Save Deployment Record
        // ========================================
        const deploymentRecord = {
            network: networkType,
            chainId: chainId,
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                TUTTokenProxy: proxyAddress,
                TUTTokenImplementation: implAddress
            },
            config: {
                name: CONFIG.name,
                symbol: CONFIG.symbol,
                initialSupply: CONFIG.initialSupply.toString(),
                cap: CONFIG.cap.toString(),
                trustedForwarder: trustedForwarder
            },
            baseBridge: BASE_BRIDGE[networkType] || null
        };

        const deploymentPath = path.join(
            __dirname,
            "..",
            "..",
            "deployments",
            `${networkType}-l1-tut-${Date.now()}.json`
        );
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2));
        console.log(`\n📄 Deployment record: ${deploymentPath}`);

        // ========================================
        // Next Steps
        // ========================================
        console.log("\n" + "=".repeat(70));
        console.log("  DEPLOYMENT COMPLETE - NEXT STEPS");
        console.log("=".repeat(70));
        
        const bridgeInfo = BASE_BRIDGE[networkType];
        
        console.log(`
✅ TUT Token deployed to Ethereum ${networkType}!

📋 Contract Addresses:
   Proxy: ${proxyAddress}
   Implementation: ${implAddress}

🔗 STEP 1: Verify on Etherscan
   npx hardhat verify --network ${networkType} ${implAddress}

🌉 STEP 2: Bridge TUT to Base
   Use the Base Bridge UI: https://bridge.base.org
   
   Or programmatically:
   - L1 Standard Bridge: ${bridgeInfo?.l1StandardBridge || "N/A"}
   - Approve TUT for bridge
   - Call depositERC20() with TUT address

🔧 STEP 3: After bridging, get L2 TUT address
   The bridged token address on Base will be different.
   Check Base bridge explorer for the L2 address.

🚀 STEP 4: Deploy remaining contracts on Base
   Update BASE_TUT_ADDRESS in .env with the bridged address
   Run: npx hardhat run scripts/deployments/deploy-mainnet.js --network base

📝 STEP 5: Transfer admin to multi-sig
   npx hardhat run scripts/deployments/transfer-to-multisig.js --network ${networkType}
`);

        return {
            proxy: proxyAddress,
            implementation: implAddress,
            deployer: deployer.address
        };

    } catch (error) {
        console.error("\n❌ DEPLOYMENT FAILED:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
