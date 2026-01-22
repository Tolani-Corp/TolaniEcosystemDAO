/**
 * Find admin of TrainingRewards contract
 */
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const TRAINING_REWARDS = "0x1fec9c4dB67b6d3531171936C13760E2a61415D7";
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const REWARDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDER_ROLE"));
  const CAMPAIGN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"));
  
  const trainingRewards = await ethers.getContractAt("TrainingRewardsSimple", TRAINING_REWARDS);
  
  // Check various addresses
  const addresses = [
    "0xa56eb5E3990C740C8c58F02eAD263feF02567677", // Old Safe
    "0x57dd8B744fd527c4cbd983d2878a29c5116ab855", // New Safe
    "0xAdBcb3Ba539b741c386d28705858Af699856B928", // Deployer
    "0x3203009FC71927c8484645B3dF17863d1eF3A21a", // Relayer wallet
  ];
  
  console.log("Checking roles on TrainingRewards:");
  console.log("=".repeat(60));
  
  for (const addr of addresses) {
    const isAdmin = await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, addr);
    const isRewarder = await trainingRewards.hasRole(REWARDER_ROLE, addr);
    const isManager = await trainingRewards.hasRole(CAMPAIGN_MANAGER_ROLE, addr);
    
    if (isAdmin || isRewarder || isManager) {
      console.log(`\n${addr}:`);
      if (isAdmin) console.log("  ✅ DEFAULT_ADMIN_ROLE");
      if (isRewarder) console.log("  ✅ REWARDER_ROLE");
      if (isManager) console.log("  ✅ CAMPAIGN_MANAGER_ROLE");
    }
  }
  
  // Get role member count
  const adminCount = await trainingRewards.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
  console.log("\n\nTotal DEFAULT_ADMIN_ROLE members:", adminCount.toString());
  
  if (adminCount > 0) {
    for (let i = 0; i < adminCount; i++) {
      const member = await trainingRewards.getRoleMember(DEFAULT_ADMIN_ROLE, i);
      console.log(`  Admin ${i}: ${member}`);
    }
  }
}

main();
