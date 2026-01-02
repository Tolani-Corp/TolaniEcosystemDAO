// scripts/deployments/check-mainnet-ready.js
// Quick check for mainnet deployment readiness

require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Testnet uses CUSTODY, Mainnet uses DEPLOYER
  const TESTNET_DEPLOYER = "0x753b53809360bec8742a235D8B60375a57965099";
  const MAINNET_DEPLOYER = process.env.METAMASK_WALLET_DEPLOYER || "0xAdBcb3Ba539b741c386d28705858Af699856B928";
  
  console.log("\n" + "=".repeat(50));
  console.log("  🚀 MAINNET DEPLOYMENT READINESS CHECK");
  console.log("=".repeat(50) + "\n");

  // Check Ethereum Mainnet
  console.log("📍 Ethereum Mainnet (for L1 TUT deployment):");
  try {
    const ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    const ethBalance = await ethProvider.getBalance(MAINNET_DEPLOYER);
    const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
    console.log(`   Deployer: ${MAINNET_DEPLOYER}`);
    console.log(`   Balance: ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`   Required: ~0.15 ETH (TUT proxy + bridge)`);
    console.log(`   Status: ${ethBalanceNum >= 0.15 ? "✅ Ready" : "❌ Need more ETH"}`);
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Check Base Mainnet
  console.log("\n📍 Base Mainnet (for ecosystem deployment):");
  try {
    const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const baseBalance = await baseProvider.getBalance(MAINNET_DEPLOYER);
    const baseBalanceNum = parseFloat(ethers.formatEther(baseBalance));
    console.log(`   Deployer: ${MAINNET_DEPLOYER}`);
    console.log(`   Balance: ${ethers.formatEther(baseBalance)} ETH`);
    console.log(`   Required: ~0.01 ETH (all ecosystem contracts)`);
    console.log(`   Status: ${baseBalanceNum >= 0.01 ? "✅ Ready" : "❌ Need more ETH"}`);
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }

  // Check config
  console.log("\n📋 Configuration Check:");
  console.log(`   Mainnet Deployer: ${MAINNET_DEPLOYER}`);
  console.log(`   Testnet Deployer: ${TESTNET_DEPLOYER}`);
  console.log(`   Gnosis Safe: ${process.env.GNOSIS_SAFE_ADDRESS || "⚠️ Not configured"}`);
  console.log(`   Etherscan API: ${process.env.ETHERSCAN_API_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Basescan API: ${process.env.BASESCAN_API_KEY ? "✅ Set" : "❌ Missing"}`);

  console.log("\n" + "=".repeat(50));
  console.log("  DEPLOYMENT STEPS");
  console.log("=".repeat(50));
  console.log(`
1. Deploy TUT on Ethereum Mainnet:
   npx hardhat run scripts/deployments/deploy-l1-tut.js --network mainnet

2. Bridge TUT to Base (via https://bridge.base.org):
   - Approve TUT for bridge
   - Bridge desired amount (e.g., 10M TUT)
   - Wait ~7 days for withdrawal or use fast bridge

3. Deploy ecosystem on Base Mainnet:
   npx hardhat run scripts/deployments/deploy-mainnet.js --network base

4. Transfer admin to Gnosis Safe:
   npx hardhat run scripts/deployments/transfer-to-multisig.js --network base
`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
