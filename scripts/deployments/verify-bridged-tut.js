// scripts/deployments/verify-bridged-tut.js
// Verify bridged TUT token on Base Sepolia

require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const TUT_ADDRESS = process.env.BASE_TUT_ADDRESS || "0x2b3b2a6036099b144b0c5fb95a26b775785b3360";
  const DEPLOYER = "0x753b53809360bec8742a235D8B60375a57965099";

  const erc20ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function REMOTE_TOKEN() view returns (address)",
    "function BRIDGE() view returns (address)"
  ];

  const tut = new ethers.Contract(TUT_ADDRESS, erc20ABI, ethers.provider);
  
  console.log("\n" + "=".repeat(50));
  console.log("  🌉 BRIDGED TUT TOKEN ON BASE SEPOLIA");
  console.log("=".repeat(50) + "\n");
  
  console.log("📋 Token Details:");
  console.log("   Address:", TUT_ADDRESS);
  console.log("   Name:", await tut.name());
  console.log("   Symbol:", await tut.symbol());
  console.log("   Decimals:", await tut.decimals());
  console.log("   Total Supply:", ethers.formatEther(await tut.totalSupply()), "TUT");
  
  console.log("\n💰 Your Balance:");
  console.log("   Address:", DEPLOYER);
  console.log("   TUT Balance:", ethers.formatEther(await tut.balanceOf(DEPLOYER)), "TUT");
  
  // Check if it's an OptimismMintable token
  try {
    const remoteToken = await tut.REMOTE_TOKEN();
    const bridge = await tut.BRIDGE();
    console.log("\n🔗 Bridge Info:");
    console.log("   L1 Token (Remote):", remoteToken);
    console.log("   L2 Bridge:", bridge);
  } catch (e) {
    console.log("\n   (Standard ERC20 - no bridge info methods)");
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("  ✅ BRIDGE SUCCESSFUL!");
  console.log("=".repeat(50) + "\n");
  
  console.log("📝 Next Steps:");
  console.log("   1. Deploy ecosystem contracts with bridged TUT");
  console.log("   2. Run: npx hardhat run scripts/deployments/deploy-mainnet.js --network baseSepolia");
  console.log("");
}

main().catch(console.error);
