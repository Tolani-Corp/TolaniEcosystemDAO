const hre = require("hardhat");
async function main() {
  const provider = hre.ethers.provider;
  
  // Check ecosystem.json TrainingRewards
  const addr1 = "0x1fec9c4dB67b6d3531171936C13760E2a61415D7";
  const code1 = await provider.getCode(addr1);
  console.log("TrainingRewards (ecosystem.json):", addr1);
  console.log("  Code exists:", code1 !== "0x");
  console.log("  Code length:", code1.length);
  
  // Try to read owner/admin from storage
  const DEFAULT_ADMIN = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  const tr = await hre.ethers.getContractAt("TrainingRewardsSimple", addr1);
  
  // Check if contract is paused
  try {
    const paused = await tr.paused();
    console.log("  Paused:", paused);
  } catch (e) {
    console.log("  paused() error:", e.message.substring(0, 50));
  }
  
  // Check uTUT address
  try {
    const utut = await tr.ututToken();
    console.log("  uTUT token:", utut);
  } catch (e) {
    console.log("  ututToken() error:", e.message.substring(0, 50));
  }
  
  // Try hasRole with known addresses
  const testAddrs = [
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677",
    "0x57dd8B744fd527c4cbd983d2878a29c5116ab855", 
    "0xAdBcb3Ba539b741c386d28705858Af699856B928",
    "0x753b53809360bec8742a235D8B60375a57965099",
  ];
  
  console.log("\n  Checking DEFAULT_ADMIN_ROLE:");
  for (const addr of testAddrs) {
    const has = await tr.hasRole(DEFAULT_ADMIN, addr);
    console.log(`    ${addr.substring(0,10)}...: ${has}`);
  }
}
main();
