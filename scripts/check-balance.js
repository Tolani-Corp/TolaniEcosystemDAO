const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  
  console.log("\n========== Wallet Balance ==========");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Address:", signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("=====================================\n");
  
  // Estimate deployment costs
  const gasPrice = await ethers.provider.getFeeData();
  console.log("Current Gas Prices:");
  console.log("  Base Fee:", gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, "gwei") + " gwei" : "N/A");
  console.log("  Max Fee:", gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, "gwei") + " gwei" : "N/A");
  console.log("  Priority Fee:", gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, "gwei") + " gwei" : "N/A");
  
  // Rough estimate: ~3M gas for all contracts
  const estimatedGas = 3000000n;
  const estimatedCost = gasPrice.gasPrice ? estimatedGas * gasPrice.gasPrice : 0n;
  console.log("\nEstimated Deployment Cost:");
  console.log("  ~", ethers.formatEther(estimatedCost), "ETH (rough estimate)");
  
  const balanceBigInt = BigInt(balance.toString());
  if (balanceBigInt < estimatedCost) {
    console.log("\n⚠️  WARNING: Insufficient balance for deployment!");
    console.log("   You may need more ETH.");
  } else {
    console.log("\n✅ Balance should be sufficient for deployment.");
  }
}

main().catch(console.error);
