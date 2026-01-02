// scripts/deployments/check-bridge-status.js
// Check bridge transaction status on both L1 and L2

require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(50));
  console.log("  BRIDGE STATUS CHECKER");
  console.log("=".repeat(50) + "\n");

  const BRIDGE_TX = "0xddf52bba5edfa3cb53597d6c5502db47fb1fb8e68cbee33eb2fab60b9f0bb16d";
  const L1_TUT = "0xDA460231C53Fe2EC9F4E47FA58387FF7DeD1680B";
  const DEPLOYER = "0x753b53809360bec8742a235D8B60375a57965099";

  // Check on L1 (Sepolia)
  console.log("📋 Checking L1 Bridge Transaction...");
  const l1Provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  try {
    const receipt = await l1Provider.getTransactionReceipt(BRIDGE_TX);
    if (receipt) {
      console.log(`   ✅ L1 TX Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   📦 Block: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      
      // Check how many confirmations
      const currentBlock = await l1Provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      console.log(`   🔢 Confirmations: ${confirmations}`);
      console.log(`   ⏰ Need ~10-20 min for L2 relay\n`);
    } else {
      console.log("   ⏳ L1 TX still pending\n");
    }
  } catch (error) {
    console.log("   ❌ Error checking L1:", error.message, "\n");
  }

  // Check on L2 (Base Sepolia) - look for token balance
  console.log("📋 Checking L2 for bridged tokens...");
  const l2Provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  
  try {
    // Check native ETH balance
    const ethBalance = await l2Provider.getBalance(DEPLOYER);
    console.log(`   💰 Your L2 ETH: ${ethers.formatEther(ethBalance)} ETH`);

    // Query OptimismMintableERC20Factory for our token
    const factoryAddress = "0x4200000000000000000000000000000000000012";
    const factoryABI = [
      "event OptimismMintableERC20Created(address indexed localToken, address indexed remoteToken, address deployer)",
      "event StandardL2TokenCreated(address indexed remoteToken, address indexed localToken)"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, l2Provider);
    
    // Look for events where remoteToken matches our L1 TUT
    const filter1 = factory.filters.OptimismMintableERC20Created(null, L1_TUT);
    const filter2 = factory.filters.StandardL2TokenCreated(L1_TUT);
    
    const events1 = await factory.queryFilter(filter1, -10000);
    const events2 = await factory.queryFilter(filter2, -10000);
    
    if (events1.length > 0) {
      console.log(`\n   🎉 BRIDGED TOKEN FOUND!`);
      console.log(`   📍 L2 TUT Address: ${events1[0].args.localToken}`);
      console.log(`\n   Add to .env: BASE_TUT_ADDRESS=${events1[0].args.localToken}`);
    } else if (events2.length > 0) {
      console.log(`\n   🎉 BRIDGED TOKEN FOUND!`);
      console.log(`   📍 L2 TUT Address: ${events2[0].args.localToken}`);
      console.log(`\n   Add to .env: BASE_TUT_ADDRESS=${events2[0].args.localToken}`);
    } else {
      console.log(`\n   ⏳ Bridged token not yet created on L2`);
      console.log(`   The Optimism sequencer is processing the bridge.`);
      console.log(`   This typically takes 10-20 minutes on testnet.\n`);
    }

    // Also try checking for any incoming token transfers to deployer
    // using the StandardBridge's finalization
    const bridgeAddress = "0x4200000000000000000000000000000000000010";
    const bridgeABI = [
      "event DepositFinalized(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)"
    ];
    const bridge = new ethers.Contract(bridgeAddress, bridgeABI, l2Provider);
    
    const bridgeFilter = bridge.filters.DepositFinalized(L1_TUT);
    const bridgeEvents = await bridge.queryFilter(bridgeFilter, -10000);
    
    if (bridgeEvents.length > 0) {
      console.log(`\n   🌉 DEPOSIT FINALIZED!`);
      for (const event of bridgeEvents) {
        console.log(`   L2 Token: ${event.args.l2Token}`);
        console.log(`   Amount: ${ethers.formatEther(event.args.amount)} TUT`);
        console.log(`   To: ${event.args.to}`);
      }
    }

  } catch (error) {
    console.log("   ❌ Error checking L2:", error.message, "\n");
  }

  console.log("\n" + "-".repeat(50));
  console.log("🔗 Manual check links:");
  console.log(`   L1 TX: https://sepolia.etherscan.io/tx/${BRIDGE_TX}`);
  console.log(`   Your L2: https://sepolia.basescan.org/address/${DEPLOYER}#tokentxns`);
  console.log("-".repeat(50) + "\n");
}

main().catch(console.error);
