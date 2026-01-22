/**
 * Check admin roles on TrainingRewards contract
 */
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const TRAINING_REWARDS = "0x1fec9c4dB67b6d3531171936C13760E2a61415D7";
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  const trainingRewards = await ethers.getContractAt("TrainingRewardsSimple", TRAINING_REWARDS);
  
  // Check both Safe addresses
  const oldSafe = "0xa56eb5E3990C740C8c58F02eAD263feF02567677";
  const newSafe = "0x57dd8B744fd527c4cbd983d2878a29c5116ab855";
  
  console.log("Checking DEFAULT_ADMIN_ROLE on TrainingRewards:");
  console.log("Old Safe (0xa56e...):", await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, oldSafe));
  console.log("New Safe (0x57dd...):", await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, newSafe));
}

main();
