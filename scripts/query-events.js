const hre = require("hardhat");
async function main() {
  const tr = await hre.ethers.getContractAt('TrainingRewardsSimple', '0x1fec9c4dB67b6d3531171936C13760E2a61415D7');
  const filter = tr.filters.RoleGranted();
  const events = await tr.queryFilter(filter, 0, 'latest');
  console.log('RoleGranted events found:', events.length);
  for (const e of events) {
    console.log('  Role:', e.args.role);
    console.log('  Account:', e.args.account);
    console.log('  Sender:', e.args.sender);
    console.log('  ---');
  }
}
main();
