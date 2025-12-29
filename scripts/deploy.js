const { ethers } = require("hardhat");

/**
 * Deployment script for the Tolani Ecosystem DAO
 * 
 * This DAO is designed to manage the TUT token ecosystem from:
 * https://github.com/Tolani-Corp/TolaniToken
 * 
 * Prerequisites:
 * - TUT token must be deployed (use the TolaniToken repository)
 * - Set TUT_TOKEN_ADDRESS environment variable to the deployed TUT proxy address
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Tolani Ecosystem DAO contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get TUT token address from environment or use a placeholder for local testing
  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  
  if (!TUT_TOKEN_ADDRESS) {
    console.log("\n⚠️  WARNING: TUT_TOKEN_ADDRESS not set.");
    console.log("   For production, set TUT_TOKEN_ADDRESS to the deployed TUT proxy address.");
    console.log("   Get the TUT token from: https://github.com/Tolani-Corp/TolaniToken\n");
    console.log("   Deploying with a mock token for local testing...\n");
  }

  // Configuration
  const MIN_DELAY = 3600; // 1 hour
  const ZERO_ADDRESS = ethers.ZeroAddress;

  // 1. Deploy or use existing TUT Token
  let tokenAddress;
  if (TUT_TOKEN_ADDRESS) {
    tokenAddress = TUT_TOKEN_ADDRESS;
    console.log("\n1. Using existing TUT Token at:", tokenAddress);
  } else {
    // For local testing, deploy a mock ERC20Votes token
    console.log("\n1. Deploying mock governance token for testing...");
    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("Mock token deployed to:", tokenAddress);
  }

  // 2. Deploy Timelock
  console.log("\n2. Deploying TolaniEcosystemTimelock...");
  const TolaniTimelock = await ethers.getContractFactory("TolaniEcosystemTimelock");
  const timelock = await TolaniTimelock.deploy(
    MIN_DELAY,
    [], // proposers - will add governor
    [], // executors - anyone can execute
    deployer.address // temporary admin
  );
  await timelock.waitForDeployment();
  console.log("TolaniEcosystemTimelock deployed to:", await timelock.getAddress());

  // 3. Deploy Governor
  console.log("\n3. Deploying TolaniEcosystemGovernor...");
  const TolaniGovernor = await ethers.getContractFactory("TolaniEcosystemGovernor");
  const governor = await TolaniGovernor.deploy(
    tokenAddress,
    await timelock.getAddress()
  );
  await governor.waitForDeployment();
  console.log("TolaniEcosystemGovernor deployed to:", await governor.getAddress());

  // 4. Deploy Treasury
  console.log("\n4. Deploying TolaniTreasury...");
  const TolaniTreasury = await ethers.getContractFactory("TolaniTreasury");
  const treasury = await TolaniTreasury.deploy(await timelock.getAddress());
  await treasury.waitForDeployment();
  console.log("TolaniTreasury deployed to:", await treasury.getAddress());

  // 5. Setup Roles
  console.log("\n5. Setting up roles...");
  
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  // Grant proposer role to governor
  await timelock.grantRole(proposerRole, await governor.getAddress());
  console.log("Granted PROPOSER_ROLE to Governor");

  // Grant executor role to zero address (anyone can execute after timelock)
  await timelock.grantRole(executorRole, ZERO_ADDRESS);
  console.log("Granted EXECUTOR_ROLE to zero address (anyone)");

  // Grant canceller role to governor
  await timelock.grantRole(cancellerRole, await governor.getAddress());
  console.log("Granted CANCELLER_ROLE to Governor");

  console.log("\n========== Deployment Complete ==========");
  console.log("TUT Token:", tokenAddress);
  console.log("Timelock:", await timelock.getAddress());
  console.log("Governor:", await governor.getAddress());
  console.log("Treasury:", await treasury.getAddress());
  console.log("==========================================");

  console.log("\n📋 Next Steps:");
  console.log("1. Grant MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE on TUT token to Timelock");
  console.log("2. Transfer ownership of ecosystem contracts to Timelock");
  console.log("3. Distribute TUT tokens to governance participants");
  console.log("4. Participants delegate voting power to themselves");
  console.log("5. Create proposals through the Governor contract");

  // Return deployed addresses
  return {
    token: tokenAddress,
    timelock: await timelock.getAddress(),
    governor: await governor.getAddress(),
    treasury: await treasury.getAddress(),
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
