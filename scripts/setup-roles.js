const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to configure roles on TUT token after DAO deployment
 * 
 * This script grants the necessary roles to the Timelock contract
 * so that the DAO can control the TUT token.
 * 
 * Prerequisites:
 * - TUT token deployed (from TolaniToken repo)
 * - DAO contracts deployed (Timelock, Governor, Treasury)
 * - Caller has DEFAULT_ADMIN_ROLE on TUT token
 * 
 * Usage:
 * TUT_TOKEN_ADDRESS=0x... TIMELOCK_ADDRESS=0x... npx hardhat run scripts/setup-roles.js --network <network>
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up roles with account:", deployer.address);

  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;

  if (!TUT_TOKEN_ADDRESS || !TIMELOCK_ADDRESS) {
    throw new Error("Set TUT_TOKEN_ADDRESS and TIMELOCK_ADDRESS in your environment");
  }

  console.log("\nTUT Token:", TUT_TOKEN_ADDRESS);
  console.log("Timelock:", TIMELOCK_ADDRESS);

  // Get TUT token contract
  const tutToken = await ethers.getContractAt(
    [
      "function MINTER_ROLE() view returns (bytes32)",
      "function PAUSER_ROLE() view returns (bytes32)",
      "function UPGRADER_ROLE() view returns (bytes32)",
      "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
      "function hasRole(bytes32 role, address account) view returns (bool)",
      "function grantRole(bytes32 role, address account)",
      "function revokeRole(bytes32 role, address account)",
    ],
    TUT_TOKEN_ADDRESS
  );

  // Get role identifiers
  const MINTER_ROLE = await tutToken.MINTER_ROLE();
  const PAUSER_ROLE = await tutToken.PAUSER_ROLE();
  const UPGRADER_ROLE = await tutToken.UPGRADER_ROLE();
  const DEFAULT_ADMIN_ROLE = await tutToken.DEFAULT_ADMIN_ROLE();

  console.log("\n--- Granting Roles to Timelock ---");

  // Grant MINTER_ROLE to Timelock
  if (!(await tutToken.hasRole(MINTER_ROLE, TIMELOCK_ADDRESS))) {
    console.log("Granting MINTER_ROLE to Timelock...");
    const tx1 = await tutToken.grantRole(MINTER_ROLE, TIMELOCK_ADDRESS);
    await tx1.wait();
    console.log("✓ MINTER_ROLE granted");
  } else {
    console.log("✓ MINTER_ROLE already granted");
  }

  // Grant PAUSER_ROLE to Timelock
  if (!(await tutToken.hasRole(PAUSER_ROLE, TIMELOCK_ADDRESS))) {
    console.log("Granting PAUSER_ROLE to Timelock...");
    const tx2 = await tutToken.grantRole(PAUSER_ROLE, TIMELOCK_ADDRESS);
    await tx2.wait();
    console.log("✓ PAUSER_ROLE granted");
  } else {
    console.log("✓ PAUSER_ROLE already granted");
  }

  // Grant UPGRADER_ROLE to Timelock
  if (!(await tutToken.hasRole(UPGRADER_ROLE, TIMELOCK_ADDRESS))) {
    console.log("Granting UPGRADER_ROLE to Timelock...");
    const tx3 = await tutToken.grantRole(UPGRADER_ROLE, TIMELOCK_ADDRESS);
    await tx3.wait();
    console.log("✓ UPGRADER_ROLE granted");
  } else {
    console.log("✓ UPGRADER_ROLE already granted");
  }

  // Optionally grant DEFAULT_ADMIN_ROLE to Timelock (for full control)
  // Uncomment if you want the DAO to have full admin control
  /*
  if (!(await tutToken.hasRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS))) {
    console.log("Granting DEFAULT_ADMIN_ROLE to Timelock...");
    const tx4 = await tutToken.grantRole(DEFAULT_ADMIN_ROLE, TIMELOCK_ADDRESS);
    await tx4.wait();
    console.log("✓ DEFAULT_ADMIN_ROLE granted");
  }
  */

  console.log("\n========== Role Setup Complete ==========");
  console.log("The DAO Timelock now has the following roles on TUT token:");
  console.log("  - MINTER_ROLE: Can mint new TUT tokens");
  console.log("  - PAUSER_ROLE: Can pause/unpause transfers");
  console.log("  - UPGRADER_ROLE: Can upgrade the token contract");
  console.log("==========================================");

  console.log("\n⚠️  Optional: To make the DAO fully autonomous, revoke roles from deployer:");
  console.log(`   tutToken.revokeRole(MINTER_ROLE, "${deployer.address}")`);
  console.log(`   tutToken.revokeRole(PAUSER_ROLE, "${deployer.address}")`);
  console.log(`   tutToken.revokeRole(UPGRADER_ROLE, "${deployer.address}")`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
