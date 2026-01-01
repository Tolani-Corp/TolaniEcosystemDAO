const { ethers } = require("hardhat");
async function main() {
  const [admin] = await ethers.getSigners();
  const OPS = "0x4d03F26dfe964dAd3C54130667d5344D30D211aB";
  
  console.log("Sending 0.005 ETH to OPS wallet...");
  const tx = await admin.sendTransaction({
    to: OPS,
    value: ethers.parseEther("0.005")
  });
  await tx.wait();
  console.log("Done:", tx.hash);
  
  const balance = await ethers.provider.getBalance(OPS);
  console.log("OPS Balance:", ethers.formatEther(balance), "ETH");
}
main();
