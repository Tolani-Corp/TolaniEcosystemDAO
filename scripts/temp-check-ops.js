const { ethers } = require("hardhat");
async function main() {
  const balance = await ethers.provider.getBalance("0x4d03F26dfe964dAd3C54130667d5344D30D211aB");
  console.log("OPS Balance:", ethers.formatEther(balance), "ETH");
}
main();
