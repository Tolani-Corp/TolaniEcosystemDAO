const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://base.llamarpc.com");
  
  const wallets = {
    "Original Deployer": "0xAdBcb3Ba539b741c386d28705858Af699856B928",
    "Relayer": "0x3203009FC71927c8484645B3dF17863d1eF3A21a",
    "Safe": "0x57dd8B744fd527c4cbd983d2878a29c5116ab855"
  };

  console.log("💰 Base Mainnet Balances:\n");
  
  for (const [name, address] of Object.entries(wallets)) {
    const balance = await provider.getBalance(address);
    console.log(`${name}: ${ethers.formatEther(balance)} ETH`);
  }
}

main().catch(console.error);
