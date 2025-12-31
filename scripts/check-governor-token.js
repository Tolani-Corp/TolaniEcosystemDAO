const { ethers } = require("hardhat");

async function main() {
  const governor = await ethers.getContractAt("TolaniEcosystemGovernor", "0xD360F7c69c18dA78461BE5364cBC56C14b584607");
  const tokenAddress = await governor.token();
  console.log("Governor's Token:", tokenAddress);
  console.log("New Token:", "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6");
  console.log("Match:", tokenAddress.toLowerCase() === "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6".toLowerCase());
}

main().catch(console.error);
