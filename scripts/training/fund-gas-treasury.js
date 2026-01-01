/**
 * Fund GasTreasuryModule with ETH
 * 
 * Sends ETH to the GasTreasuryModule contract for sponsoring gasless transactions
 * 
 * Usage:
 *   npx hardhat run scripts/training/fund-gas-treasury.js --network baseSepolia
 */

const { ethers } = require("hardhat");

// GasTreasuryModule addresses by network
const GAS_TREASURY = {
  baseSepolia: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
  sepolia: "0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd"
};

// Amount to fund (in ETH)
const FUND_AMOUNT = "0.01"; // 0.01 ETH

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? "baseSepolia" : "sepolia";
  
  const treasuryAddress = GAS_TREASURY[networkName];
  
  console.log("=".repeat(50));
  console.log("FUND GAS TREASURY MODULE");
  console.log("=".repeat(50));
  console.log(`Network: ${networkName}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log("");
  
  // Check signer balance
  const signerBalance = await ethers.provider.getBalance(signer.address);
  console.log(`Signer Balance: ${ethers.formatEther(signerBalance)} ETH`);
  
  // Check current treasury balance
  const treasuryBalance = await ethers.provider.getBalance(treasuryAddress);
  console.log(`Treasury Balance: ${ethers.formatEther(treasuryBalance)} ETH`);
  console.log("");
  
  const fundAmount = ethers.parseEther(FUND_AMOUNT);
  
  if (signerBalance < fundAmount) {
    console.log(`❌ Insufficient balance to fund ${FUND_AMOUNT} ETH`);
    return;
  }
  
  console.log(`📤 Sending ${FUND_AMOUNT} ETH to GasTreasury...`);
  
  const tx = await signer.sendTransaction({
    to: treasuryAddress,
    value: fundAmount
  });
  
  console.log(`   Tx: ${tx.hash}`);
  await tx.wait();
  
  // Check new balance
  const newTreasuryBalance = await ethers.provider.getBalance(treasuryAddress);
  console.log("");
  console.log(`✅ Treasury funded!`);
  console.log(`   New Balance: ${ethers.formatEther(newTreasuryBalance)} ETH`);
  console.log("");
  console.log(`🔗 View: https://sepolia.basescan.org/address/${treasuryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
