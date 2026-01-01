const { ethers } = require("hardhat");
async function main() {
  const treasury = await ethers.getContractAt("GasTreasuryModuleSimple", "0xC12035B044c5988E9977E50bA0913AEF4eec28F7");
  const balance = await treasury.getBalance();
  console.log("Treasury contract balance:", ethers.formatEther(balance), "ETH");
  
  // Also check native balance
  const nativeBalance = await ethers.provider.getBalance("0xC12035B044c5988E9977E50bA0913AEF4eec28F7");
  console.log("Native ETH balance:", ethers.formatEther(nativeBalance), "ETH");
}
main();
