/**
 * Check who has admin rights on uTUT contract
 */
const { ethers } = require("hardhat");

const UTUT = "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

const WALLETS = {
  "Original Deployer": "0xAdBcb3Ba539b741c386d28705858Af699856B928",
  "Current Deployer": "0x3203009FC71927c8484645B3dF17863d1eF3A21a",
  "New Safe": "0x57dd8B744fd527c4cbd983d2878a29c5116ab855",
  "Safe Owner": "0xA484fC94908c821A18d60312F620B135D1b55235",
  "Timelock": "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d",
  "Treasury": "0x3FaB09377944144eB991DB2a5ADf2C96A5e8587c",
  "TrainingRewards": "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526"
};

async function main() {
  const uTUT = await ethers.getContractAt(
    ["function hasRole(bytes32 role, address account) view returns (bool)",
     "function getRoleAdmin(bytes32 role) view returns (bytes32)",
     "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"],
    UTUT
  );

  console.log("🔍 Checking uTUT contract:", UTUT);
  console.log("=" .repeat(60));
  
  console.log("\n📋 DEFAULT_ADMIN_ROLE holders:");
  for (const [name, address] of Object.entries(WALLETS)) {
    const hasAdmin = await uTUT.hasRole(DEFAULT_ADMIN_ROLE, address);
    console.log(`  ${name} (${address.slice(0,10)}...): ${hasAdmin ? '✅ YES' : '❌ NO'}`);
  }

  console.log("\n📋 MINTER_ROLE holders:");
  for (const [name, address] of Object.entries(WALLETS)) {
    const hasMinter = await uTUT.hasRole(MINTER_ROLE, address);
    console.log(`  ${name} (${address.slice(0,10)}...): ${hasMinter ? '✅ YES' : '❌ NO'}`);
  }

  // Check role admin
  const roleAdmin = await uTUT.getRoleAdmin(MINTER_ROLE);
  console.log("\n📋 MINTER_ROLE admin:", roleAdmin);
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
