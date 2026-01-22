const hre = require("hardhat");
async function main() {
  const tr = await hre.ethers.getContractAt('TrainingRewardsSimple', '0x1fec9c4dB67b6d3531171936C13760E2a61415D7');
  const DEFAULT_ADMIN = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const deployer = '0xAdBcb3Ba539b741c386d28705858Af699856B928';
  console.log('Deployer is admin:', await tr.hasRole(DEFAULT_ADMIN, deployer));
}
main();
