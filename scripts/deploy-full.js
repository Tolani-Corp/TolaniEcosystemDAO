const { ethers, network } = require("hardhat");
const { deployCanonicalTUT, DEFAULT_TRUSTED_FORWARDER } = require("./lib/deploy-tut");

/**
 * Deployment script for the complete Tolani Ecosystem DAO.
 *
 * Uses the canonical TUT token by default when TUT_TOKEN_ADDRESS is not
 * provided. Set USE_MOCK_GOV_TOKEN=true only for isolated mock testing.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Tolani Ecosystem DAO contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

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
    if (USE_MOCK_GOV_TOKEN) {
      console.log("USE_MOCK_GOV_TOKEN=true detected, deploying a mock token for testing.\n");
    } else {
      console.log("Deploying the canonical TUT token from this repository.\n");
    }
  }

  const MIN_DELAY = 3600;
  const ZERO_ADDRESS = ethers.ZeroAddress;

  let tokenAddress;
  if (configuredTokenAddress) {
    tokenAddress = configuredTokenAddress;
    console.log("\n================================================");
    console.log("PHASE 1: Using existing TUT Token");
    console.log("================================================");
    console.log("Token Address:", tokenAddress);
  } else if (!USE_MOCK_GOV_TOKEN) {
    console.log("\n================================================");
    console.log("PHASE 1: Deploying Canonical TUT Token");
    console.log("================================================");
    const tokenDeployment = await deployCanonicalTUT({
      owner: deployer.address,
      trustedForwarder: process.env.TUT_TRUSTED_FORWARDER || DEFAULT_TRUSTED_FORWARDER,
    });
    tokenAddress = tokenDeployment.proxyAddress;
    console.log("Canonical TUT deployed to:", tokenAddress);
  } else {
    console.log("\n================================================");
    console.log("PHASE 1: Deploying Mock Governance Token");
    console.log("================================================");
    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("Mock Token deployed to:", tokenAddress);
  }

  console.log("\n================================================");
  console.log("PHASE 2: Deploying Core Governance");
  console.log("================================================");

  const TolaniTimelock = await ethers.getContractFactory("TolaniEcosystemTimelock");
  const timelock = await TolaniTimelock.deploy(MIN_DELAY, [], [], deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("Timelock deployed to:", timelockAddress);

  const TolaniGovernor = await ethers.getContractFactory("TolaniEcosystemGovernor");
  const governor = await TolaniGovernor.deploy(tokenAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("Governor deployed to:", governorAddress);

  const TolaniTreasury = await ethers.getContractFactory("TolaniTreasury");
  const treasury = await TolaniTreasury.deploy(timelockAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  console.log("\n================================================");
  console.log("PHASE 3: Deploying Ecosystem Contracts");
  console.log("================================================");

  const TolaniEscrow = await ethers.getContractFactory("TolaniEscrow");
  const escrow = await TolaniEscrow.deploy(tokenAddress, timelockAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddress);

  const TolaniPayroll = await ethers.getContractFactory("TolaniPayroll");
  const payroll = await TolaniPayroll.deploy(tokenAddress, timelockAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("Payroll deployed to:", payrollAddress);

  const TolaniCompliance = await ethers.getContractFactory("TolaniCompliance");
  const compliance = await TolaniCompliance.deploy(timelockAddress);
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("Compliance deployed to:", complianceAddress);

  const TolaniESG = await ethers.getContractFactory("TolaniESG");
  const esg = await TolaniESG.deploy(timelockAddress);
  await esg.waitForDeployment();
  const esgAddress = await esg.getAddress();
  console.log("ESG deployed to:", esgAddress);

  console.log("\n================================================");
  console.log("PHASE 4: Setting Up Roles");
  console.log("================================================");

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  await timelock.grantRole(proposerRole, governorAddress);
  console.log("Granted PROPOSER_ROLE to Governor");

  await timelock.grantRole(executorRole, ZERO_ADDRESS);
  console.log("Granted EXECUTOR_ROLE to zero address (anyone)");

  await timelock.grantRole(cancellerRole, governorAddress);
  console.log("Granted CANCELLER_ROLE to Governor");

  console.log("\n================================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("================================================");
  console.log("\nCore Governance:");
  console.log("   Token:      ", tokenAddress);
  console.log("   Timelock:   ", timelockAddress);
  console.log("   Governor:   ", governorAddress);
  console.log("   Treasury:   ", treasuryAddress);
  console.log("\nEcosystem Contracts:");
  console.log("   Escrow:     ", escrowAddress);
  console.log("   Payroll:    ", payrollAddress);
  console.log("   Compliance: ", complianceAddress);
  console.log("   ESG:        ", esgAddress);

  console.log("\nEnvironment Variables to Set:");
  console.log("------------------------------------------------");
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_TIMELOCK_ADDRESS=${timelockAddress}`);
  console.log(`NEXT_PUBLIC_GOVERNOR_ADDRESS=${governorAddress}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`NEXT_PUBLIC_PAYROLL_ADDRESS=${payrollAddress}`);
  console.log(`NEXT_PUBLIC_COMPLIANCE_ADDRESS=${complianceAddress}`);
  console.log(`NEXT_PUBLIC_ESG_ADDRESS=${esgAddress}`);
  console.log("------------------------------------------------");

  console.log("\nNext Steps:");
  console.log("1. Update .env with the addresses above");
  console.log("2. Verify contracts on Etherscan");
  console.log("3. Distribute tokens to governance participants");
  console.log("4. Participants delegate voting power");
  console.log("5. Create and vote on proposals through the Governor");

  return {
    token: tokenAddress,
    timelock: timelockAddress,
    governor: governorAddress,
    treasury: treasuryAddress,
    escrow: escrowAddress,
    payroll: payrollAddress,
    compliance: complianceAddress,
    esg: esgAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
