const hre = require("hardhat");
async function main() {
  // Check BOTH TrainingRewards contracts
  const DEFAULT_ADMIN = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const REWARDER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("REWARDER_ROLE"));
  const CAMPAIGN_MANAGER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"));
  
  const addresses = [
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677", // Old Safe from ecosystem.json
    "0x57dd8B744fd527c4cbd983d2878a29c5116ab855", // User's Safe
    "0xAdBcb3Ba539b741c386d28705858Af699856B928", // Deployer 1
    "0x753b53809360bec8742a235D8B60375a57965099", // Deployer 2
    "0x3203009FC71927c8484645B3dF17863d1eF3A21a", // Relayer
  ];
  
  // Check ecosystem.json TrainingRewards
  console.log("=== TrainingRewards from ecosystem.json ===");
  console.log("Address: 0x1fec9c4dB67b6d3531171936C13760E2a61415D7");
  try {
    const tr1 = await hre.ethers.getContractAt('TrainingRewardsSimple', '0x1fec9c4dB67b6d3531171936C13760E2a61415D7');
    for (const addr of addresses) {
      const isAdmin = await tr1.hasRole(DEFAULT_ADMIN, addr);
      const isRewarder = await tr1.hasRole(REWARDER_ROLE, addr);
      const isManager = await tr1.hasRole(CAMPAIGN_MANAGER_ROLE, addr);
      if (isAdmin || isRewarder || isManager) {
        console.log(`${addr}: ADMIN=${isAdmin} REWARDER=${isRewarder} MANAGER=${isManager}`);
      }
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
  
  // Check other deployment TrainingRewards  
  console.log("\n=== TrainingRewards from other deployment ===");
  console.log("Address: 0x05b5Cc6741220cAe3fFf39753B036EBe2a54F1b5");
  try {
    const tr2 = await hre.ethers.getContractAt('TrainingRewardsSimple', '0x05b5Cc6741220cAe3fFf39753B036EBe2a54F1b5');
    for (const addr of addresses) {
      const isAdmin = await tr2.hasRole(DEFAULT_ADMIN, addr);
      const isRewarder = await tr2.hasRole(REWARDER_ROLE, addr);
      const isManager = await tr2.hasRole(CAMPAIGN_MANAGER_ROLE, addr);
      if (isAdmin || isRewarder || isManager) {
        console.log(`${addr}: ADMIN=${isAdmin} REWARDER=${isRewarder} MANAGER=${isManager}`);
      }
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
main();
