const { ethers, network } = require("hardhat");
const { deployCanonicalTUT, DEFAULT_TRUSTED_FORWARDER } = require("./lib/deploy-tut");

/**
 * Deployment script for the Tolani Ecosystem DAO.
 *
 * By default, local deployments now use the canonical TUT token in this
 * repository. Set USE_MOCK_GOV_TOKEN=true only when you explicitly want the
 * legacy mock token path for isolated testing.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Tolani Ecosystem DAO contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  let configuredTokenAddress = process.env.TUT_TOKEN_ADDRESS;
  const USE_MOCK_GOV_TOKEN = process.env.USE_MOCK_GOV_TOKEN === "true";

  if (configuredTokenAddress && (network.name === "hardhat" || network.name === "localhost")) {
    const code = await ethers.provider.getCode(configuredTokenAddress);
    if (code === "0x") {
      console.log(
        `\nConfigured TUT_TOKEN_ADDRESS ${configuredTokenAddress} has no contract on ${network.name}.`
      );
      console.log("Falling back to canonical local TUT deployment instead.\n");
      configuredTokenAddress = undefined;
    }
  }

  if (!configuredTokenAddress) {
    console.log("\nWARNING: TUT_TOKEN_ADDRESS not set.");
    console.log("For production, set TUT_TOKEN_ADDRESS to the deployed TUT proxy address.");
    if (USE_MOCK_GOV_TOKEN) {
      console.log("USE_MOCK_GOV_TOKEN=true detected, deploying a mock governance token.\n");
    } else {
      console.log("Deploying the canonical TUT token from this repository for local testing.\n");
    }
  }

  const MIN_DELAY = 3600;
  const ZERO_ADDRESS = ethers.ZeroAddress;

  let tokenAddress;
  if (configuredTokenAddress) {
    tokenAddress = configuredTokenAddress;
    console.log("\n1. Using existing TUT Token at:", tokenAddress);
  } else if (!USE_MOCK_GOV_TOKEN) {
    console.log("\n1. Deploying canonical TUT token for testing...");
    const tokenDeployment = await deployCanonicalTUT({
      owner: deployer.address,
      trustedForwarder: process.env.TUT_TRUSTED_FORWARDER || DEFAULT_TRUSTED_FORWARDER,
    });
    tokenAddress = tokenDeployment.proxyAddress;
    console.log("Canonical TUT proxy deployed to:", tokenAddress);
  } else {
    console.log("\n1. Deploying mock governance token for testing...");
    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("Mock token deployed to:", tokenAddress);
  }

  console.log("\n2. Deploying TolaniEcosystemTimelock...");
  const TolaniTimelock = await ethers.getContractFactory("TolaniEcosystemTimelock");
  const timelock = await TolaniTimelock.deploy(
    MIN_DELAY,
    [],
    [],
    deployer.address
  );
  await timelock.waitForDeployment();
  console.log("TolaniEcosystemTimelock deployed to:", await timelock.getAddress());

  console.log("\n3. Deploying TolaniEcosystemGovernor...");
  const TolaniGovernor = await ethers.getContractFactory("TolaniEcosystemGovernor");
  const governor = await TolaniGovernor.deploy(
    tokenAddress,
    await timelock.getAddress()
  );
  await governor.waitForDeployment();
  console.log("TolaniEcosystemGovernor deployed to:", await governor.getAddress());

  console.log("\n4. Deploying TolaniTreasury...");
  const TolaniTreasury = await ethers.getContractFactory("TolaniTreasury");
  const treasury = await TolaniTreasury.deploy(await timelock.getAddress());
  await treasury.waitForDeployment();
  console.log("TolaniTreasury deployed to:", await treasury.getAddress());

  console.log("\n5. Setting up roles...");
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  await timelock.grantRole(proposerRole, await governor.getAddress());
  console.log("Granted PROPOSER_ROLE to Governor");

  await timelock.grantRole(executorRole, ZERO_ADDRESS);
  console.log("Granted EXECUTOR_ROLE to zero address (anyone)");

  await timelock.grantRole(cancellerRole, await governor.getAddress());
  console.log("Granted CANCELLER_ROLE to Governor");

  console.log("\n========== Deployment Complete ==========");
  console.log("TUT Token:", tokenAddress);
  console.log("Timelock:", await timelock.getAddress());
  console.log("Governor:", await governor.getAddress());
  console.log("Treasury:", await treasury.getAddress());
  console.log("==========================================");

  console.log("\nNext Steps:");
  console.log("1. Grant MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE on TUT token to Timelock");
  console.log("2. Transfer ownership of ecosystem contracts to Timelock");
  console.log("3. Distribute TUT tokens to governance participants");
  console.log("4. Participants delegate voting power to themselves");
  console.log("5. Create proposals through the Governor contract");

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
