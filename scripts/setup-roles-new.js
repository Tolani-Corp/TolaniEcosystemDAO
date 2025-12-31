const { ethers } = require("hardhat");

/**
 * Setup roles for newly deployed contracts
 * Run this after deploy-full.js if role setup failed
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up roles with account:", deployer.address);

  // New deployment addresses (Sepolia - Dec 30, 2025)
  const TIMELOCK_ADDRESS = "0xf4758a12583F424B65CC860A2fF3D3B501cf591C".toLowerCase();
  const GOVERNOR_ADDRESS = "0xD360F7c69c18dA78461BE5364cBC56C14b584607".toLowerCase();

  const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", TIMELOCK_ADDRESS);

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  console.log("\nChecking current roles...");
  
  // Check if roles are already granted
  const hasProposer = await timelock.hasRole(proposerRole, GOVERNOR_ADDRESS);
  const hasExecutor = await timelock.hasRole(executorRole, ethers.ZeroAddress);
  const hasCanceller = await timelock.hasRole(cancellerRole, GOVERNOR_ADDRESS);

  console.log("Governor has PROPOSER_ROLE:", hasProposer);
  console.log("ZeroAddress has EXECUTOR_ROLE:", hasExecutor);
  console.log("Governor has CANCELLER_ROLE:", hasCanceller);

  if (!hasProposer) {
    console.log("\nGranting PROPOSER_ROLE to Governor...");
    const tx1 = await timelock.grantRole(proposerRole, GOVERNOR_ADDRESS);
    await tx1.wait();
    console.log("✓ Granted PROPOSER_ROLE");
  }

  if (!hasExecutor) {
    console.log("\nGranting EXECUTOR_ROLE to zero address...");
    const tx2 = await timelock.grantRole(executorRole, ethers.ZeroAddress);
    await tx2.wait();
    console.log("✓ Granted EXECUTOR_ROLE");
  }

  if (!hasCanceller) {
    console.log("\nGranting CANCELLER_ROLE to Governor...");
    const tx3 = await timelock.grantRole(cancellerRole, GOVERNOR_ADDRESS);
    await tx3.wait();
    console.log("✓ Granted CANCELLER_ROLE");
  }

  console.log("\n✅ Role setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
