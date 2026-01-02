// scripts/deployments/bridge-tut-to-base-mainnet.js
// Bridge TUT from Ethereum Mainnet to Base Mainnet via Native Bridge
// This is a TWO-STEP process:
// Step 1: Deploy OptimismMintableERC20 on Base (run with --network base)
// Step 2: Bridge TUT from L1 to L2 (run with --network mainnet)

require("dotenv").config();
const { ethers } = require("hardhat");

// L1 Contract Addresses (Ethereum Mainnet)
const L1_STANDARD_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const L1_TUT_ADDRESS = process.env.MAINNET_TUT_PROXY || "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D";

// L2 Contract Addresses (Base Mainnet)  
const L2_STANDARD_BRIDGE = "0x4200000000000000000000000000000000000010";
const L2_MINTABLE_FACTORY = "0xF10122D428B4bc8A9d050D06a2037259b4c4B83B";

// Amount to bridge
const BRIDGE_AMOUNT = ethers.parseUnits("10000000", 18); // 10M TUT

async function deployL2Token() {
    console.log("\n" + "=".repeat(50));
    console.log("  📦 STEP 1: Deploy OptimismMintableERC20 on Base");
    console.log("=".repeat(50) + "\n");

    const [deployer] = await ethers.getSigners();
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    // OptimismMintableERC20Factory ABI
    const factoryABI = [
        "function createOptimismMintableERC20(address _remoteToken, string memory _name, string memory _symbol) external returns (address)",
        "event OptimismMintableERC20Created(address indexed localToken, address indexed remoteToken, address deployer)"
    ];
    
    const factory = new ethers.Contract(L2_MINTABLE_FACTORY, factoryABI, deployer);
    
    console.log("🔧 Creating OptimismMintableERC20 for TUT...");
    console.log(`   Remote Token (L1 TUT): ${L1_TUT_ADDRESS}`);
    console.log(`   Name: TUT Token (Bridged)`);
    console.log(`   Symbol: TUT\n`);
    
    const tx = await factory.createOptimismMintableERC20(
        L1_TUT_ADDRESS,
        "TUT Token (Bridged)",
        "TUT",
        { gasLimit: 500000 }
    );
    
    console.log(`   TX: ${tx.hash}`);
    console.log(`   Basescan: https://basescan.org/tx/${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ TX confirmed in block ${receipt.blockNumber}\n`);
    
    // Find the created token address from events
    const event = receipt.logs.find(log => {
        try {
            const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
            return parsed?.name === "OptimismMintableERC20Created";
        } catch { return false; }
    });
    
    if (event) {
        const parsed = factory.interface.parseLog({ topics: event.topics, data: event.data });
        const l2TokenAddress = parsed.args.localToken;
        console.log("=".repeat(50));
        console.log("  🎉 L2 TUT TOKEN CREATED!");
        console.log("=".repeat(50));
        console.log(`\n   L2 TUT Address: ${l2TokenAddress}`);
        console.log(`   Basescan: https://basescan.org/address/${l2TokenAddress}\n`);
        console.log("📝 Next Steps:");
        console.log(`   1. Add to .env: BASE_TUT_ADDRESS=${l2TokenAddress}`);
        console.log(`   2. Run bridge step: npx hardhat run scripts/deployments/bridge-tut-to-base-mainnet.js --network mainnet\n`);
        return l2TokenAddress;
    } else {
        console.log("⚠️  Could not find L2 token address in logs. Check Basescan for the transaction.");
    }
}

async function bridgeFromL1() {
    console.log("\n" + "=".repeat(50));
    console.log("  🌉 STEP 2: Bridge TUT from Ethereum to Base");
    console.log("=".repeat(50) + "\n");

    const [deployer] = await ethers.getSigners();
    
    // Check if L2 token address is set
    const l2TokenAddress = process.env.BASE_TUT_ADDRESS;
    if (!l2TokenAddress) {
        console.log("❌ ERROR: BASE_TUT_ADDRESS not set in .env");
        console.log("   First run Step 1 on Base network to deploy the L2 token.");
        console.log("   npx hardhat run scripts/deployments/bridge-tut-to-base-mainnet.js --network base");
        return;
    }

    console.log("📋 Bridge Info:");
    console.log(`   From: Ethereum Mainnet`);
    console.log(`   To: Base Mainnet`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   L1 TUT: ${L1_TUT_ADDRESS}`);
    console.log(`   L2 TUT: ${l2TokenAddress}`);
    console.log(`   Amount: ${ethers.formatEther(BRIDGE_AMOUNT)} TUT`);
    console.log(`   Bridge: ${L1_STANDARD_BRIDGE}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Get TUT contract
    const tutABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const tut = new ethers.Contract(L1_TUT_ADDRESS, tutABI, deployer);

    // Check TUT balance
    const tutBalance = await tut.balanceOf(deployer.address);
    console.log(`📊 Your TUT Balance: ${ethers.formatEther(tutBalance)} TUT`);

    if (tutBalance < BRIDGE_AMOUNT) {
        console.log(`❌ ERROR: Insufficient TUT balance`);
        return;
    }

    // Safety confirmation
    console.log("\n⚠️  WARNING: You are about to bridge TUT to BASE MAINNET");
    console.log("   The native bridge takes ~7 days to finalize.");
    console.log("\n   Press Ctrl+C within 10 seconds to cancel...\n");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // L1 Standard Bridge ABI - use depositERC20 with the proper L2 token address
    const bridgeABI = [
        "function depositERC20(address _l1Token, address _l2Token, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external",
        "function depositERC20To(address _l1Token, address _l2Token, address _to, uint256 _amount, uint32 _minGasLimit, bytes calldata _extraData) external"
    ];
    const bridge = new ethers.Contract(L1_STANDARD_BRIDGE, bridgeABI, deployer);

    // Step 2a: Approve TUT for bridge
    console.log("-".repeat(50));
    console.log("📦 Step 2a: Checking/Approving TUT for bridge...");
    
    const currentAllowance = await tut.allowance(deployer.address, L1_STANDARD_BRIDGE);
    console.log(`   Current allowance: ${ethers.formatEther(currentAllowance)} TUT`);
    
    if (currentAllowance < BRIDGE_AMOUNT) {
        const approveTx = await tut.approve(L1_STANDARD_BRIDGE, BRIDGE_AMOUNT, { gasLimit: 100000 });
        console.log(`   Approval TX: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("   ✅ Approved!\n");
    } else {
        console.log("   ✅ Already approved (sufficient allowance)\n");
    }

    // Step 2b: Bridge TUT using depositERC20 with the L2 token address
    console.log("📦 Step 2b: Initiating bridge via depositERC20...");
    console.log(`   L1 Token: ${L1_TUT_ADDRESS}`);
    console.log(`   L2 Token: ${l2TokenAddress}`);
    
    const bridgeTx = await bridge.depositERC20(
        L1_TUT_ADDRESS,    // L1 token
        l2TokenAddress,    // L2 token (created in Step 1)
        BRIDGE_AMOUNT,
        200000,            // Min gas limit for L2
        "0x",              // Extra data
        { gasLimit: 300000 }
    );
    
    console.log(`   Bridge TX: ${bridgeTx.hash}`);
    console.log(`   Etherscan: https://etherscan.io/tx/${bridgeTx.hash}`);
    
    const receipt = await bridgeTx.wait();
    console.log(`   ✅ Bridge initiated! Gas used: ${receipt.gasUsed.toString()}\n`);

    console.log("=".repeat(50));
    console.log("  🎉 BRIDGE INITIATED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`
📋 Summary:
   Amount: ${ethers.formatEther(BRIDGE_AMOUNT)} TUT
   L1 TX: ${bridgeTx.hash}
   L2 TUT: ${l2TokenAddress}

⏳ What's Next:
   1. The bridge takes ~7 days to finalize (native bridge)
   2. After finalization, your TUT will appear at:
      https://basescan.org/address/${deployer.address}#tokentxns
   3. Track the bridge at:
      https://basescan.org/address/${l2TokenAddress}

📝 After bridging completes:
   Update .env if needed and deploy ecosystem:
   npx hardhat run scripts/deployments/deploy-mainnet.js --network base
`);
}

async function main() {
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log(`\n🔗 Connected to: ${network.name} (Chain ID: ${chainId})\n`);
    
    if (chainId === 8453) {
        // Base Mainnet - Deploy L2 token
        await deployL2Token();
    } else if (chainId === 1) {
        // Ethereum Mainnet - Bridge tokens
        await bridgeFromL1();
    } else {
        console.log("❌ ERROR: Unsupported network");
        console.log("   Supported networks:");
        console.log("   - base (Chain ID 8453) - Deploy L2 token");
        console.log("   - mainnet (Chain ID 1) - Bridge tokens from L1");
        console.log("\n   Usage:");
        console.log("   Step 1: npx hardhat run scripts/deployments/bridge-tut-to-base-mainnet.js --network base");
        console.log("   Step 2: npx hardhat run scripts/deployments/bridge-tut-to-base-mainnet.js --network mainnet");
    }
}

main().catch(console.error);
