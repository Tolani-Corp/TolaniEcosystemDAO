const { ethers } = require("hardhat");

/**
 * Setup roles for newly deployed DAO contracts
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up roles with account:", deployer.address);

  // New deployment addresses
  const TIMELOCK = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";
  const GOVERNOR = "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f";
  const TREASURY = "0xBB9d207ee665e9680458F2E451098f23D707Ad25";
  const TOKEN = "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6";

  const ZERO_ADDRESS = ethers.ZeroAddress;

  // Get timelock contract
  const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", TIMELOCK);

  // Get role identifiers
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  console.log("\nChecking current roles...");
  console.log("Governor has PROPOSER_ROLE:", await timelock.hasRole(proposerRole, GOVERNOR));
  console.log("Anyone has EXECUTOR_ROLE:", await timelock.hasRole(executorRole, ZERO_ADDRESS));
  console.log("Governor has CANCELLER_ROLE:", await timelock.hasRole(cancellerRole, GOVERNOR));

  // Grant missing roles
  console.log("\nGranting missing roles...");

  if (!(await timelock.hasRole(proposerRole, GOVERNOR))) {
    console.log("Granting PROPOSER_ROLE to Governor...");
    const tx1 = await timelock.grantRole(proposerRole, GOVERNOR);
    await tx1.wait();
    console.log("✅ PROPOSER_ROLE granted");
  }

  if (!(await timelock.hasRole(executorRole, ZERO_ADDRESS))) {
    console.log("Granting EXECUTOR_ROLE to zero address...");
    const tx2 = await timelock.grantRole(executorRole, ZERO_ADDRESS);
    await tx2.wait();
    console.log("✅ EXECUTOR_ROLE granted");
  }

  if (!(await timelock.hasRole(cancellerRole, GOVERNOR))) {
    console.log("Granting CANCELLER_ROLE to Governor...");
    const tx3 = await timelock.grantRole(cancellerRole, GOVERNOR);
    await tx3.wait();
    console.log("✅ CANCELLER_ROLE granted");
  }

  console.log("\n=== Final Role Status ===");
  console.log("Governor has PROPOSER_ROLE:", await timelock.hasRole(proposerRole, GOVERNOR));
  console.log("Anyone has EXECUTOR_ROLE:", await timelock.hasRole(executorRole, ZERO_ADDRESS));
  console.log("Governor has CANCELLER_ROLE:", await timelock.hasRole(cancellerRole, GOVERNOR));

  console.log("\n========== New DAO Addresses ==========");
  console.log("Token:", TOKEN);
  console.log("Timelock:", TIMELOCK);
  console.log("Governor:", GOVERNOR);
  console.log("Treasury:", TREASURY);
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
