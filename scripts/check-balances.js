const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  
  console.log("💰 Wallet Balances on Base:\n");
  
  for (let i = 0; i < signers.length; i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    console.log(`${i === 0 ? 'Deployer' : 'Relayer '}: ${signers[i].address}`);
    console.log(`          Balance: ${ethers.formatEther(balance)} ETH\n`);
  }
}

main().catch(console.error);
