const { ethers } = require("hardhat");

/**
 * Deployment script for the complete Tolani Ecosystem DAO
 * 
 * This deploys:
 * - Core Governance: Governor, Timelock, Treasury
 * - Ecosystem Contracts: Escrow, Payroll, Compliance, ESG
 * 
 * All ecosystem contracts are owned by the Timelock for DAO control.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Tolani Ecosystem DAO contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Get TUT token address from environment
  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  
  if (!TUT_TOKEN_ADDRESS) {
    console.log("\n⚠️  WARNING: TUT_TOKEN_ADDRESS not set.");
    console.log("   Deploying with a mock token for testing...\n");
  }

  // Configuration
  const MIN_DELAY = 3600; // 1 hour timelock delay
  const ZERO_ADDRESS = ethers.ZeroAddress;

  // ===== PHASE 1: Core Token =====
  let tokenAddress;
  if (TUT_TOKEN_ADDRESS) {
    tokenAddress = TUT_TOKEN_ADDRESS;
    console.log("\n═══════════════════════════════════════════════");
    console.log("PHASE 1: Using existing TUT Token");
    console.log("═══════════════════════════════════════════════");
    console.log("Token Address:", tokenAddress);
  } else {
    console.log("\n═══════════════════════════════════════════════");
    console.log("PHASE 1: Deploying Mock Governance Token");
    console.log("═══════════════════════════════════════════════");
    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("Mock Token deployed to:", tokenAddress);
  }

  // ===== PHASE 2: Core Governance =====
  console.log("\n═══════════════════════════════════════════════");
  console.log("PHASE 2: Deploying Core Governance");
  console.log("═══════════════════════════════════════════════");

  // Deploy Timelock
  console.log("\n2.1 Deploying TolaniEcosystemTimelock...");
  const TolaniTimelock = await ethers.getContractFactory("TolaniEcosystemTimelock");
  const timelock = await TolaniTimelock.deploy(
    MIN_DELAY,
    [], // proposers - will add governor
    [], // executors - anyone can execute
    deployer.address // temporary admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("Timelock deployed to:", timelockAddress);

  // Deploy Governor
  console.log("\n2.2 Deploying TolaniEcosystemGovernor...");
  const TolaniGovernor = await ethers.getContractFactory("TolaniEcosystemGovernor");
  const governor = await TolaniGovernor.deploy(tokenAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("Governor deployed to:", governorAddress);

  // Deploy Treasury
  console.log("\n2.3 Deploying TolaniTreasury...");
  const TolaniTreasury = await ethers.getContractFactory("TolaniTreasury");
  const treasury = await TolaniTreasury.deploy(timelockAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // ===== PHASE 3: Ecosystem Contracts =====
  console.log("\n═══════════════════════════════════════════════");
  console.log("PHASE 3: Deploying Ecosystem Contracts");
  console.log("═══════════════════════════════════════════════");

  // Deploy Escrow
  console.log("\n3.1 Deploying TolaniEscrow...");
  const TolaniEscrow = await ethers.getContractFactory("TolaniEscrow");
  const escrow = await TolaniEscrow.deploy(tokenAddress, timelockAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddress);

  // Deploy Payroll
  console.log("\n3.2 Deploying TolaniPayroll...");
  const TolaniPayroll = await ethers.getContractFactory("TolaniPayroll");
  const payroll = await TolaniPayroll.deploy(tokenAddress, timelockAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("Payroll deployed to:", payrollAddress);

  // Deploy Compliance
  console.log("\n3.3 Deploying TolaniCompliance...");
  const TolaniCompliance = await ethers.getContractFactory("TolaniCompliance");
  const compliance = await TolaniCompliance.deploy(timelockAddress);
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("Compliance deployed to:", complianceAddress);

  // Deploy ESG
  console.log("\n3.4 Deploying TolaniESG...");
  const TolaniESG = await ethers.getContractFactory("TolaniESG");
  const esg = await TolaniESG.deploy(timelockAddress);
  await esg.waitForDeployment();
  const esgAddress = await esg.getAddress();
  console.log("ESG deployed to:", esgAddress);

  // ===== PHASE 4: Setup Roles =====
  console.log("\n═══════════════════════════════════════════════");
  console.log("PHASE 4: Setting Up Roles");
  console.log("═══════════════════════════════════════════════");

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();

  console.log("\n4.1 Granting Governor roles on Timelock...");
  await timelock.grantRole(proposerRole, governorAddress);
  console.log("✓ Granted PROPOSER_ROLE to Governor");
  
  await timelock.grantRole(executorRole, ZERO_ADDRESS);
  console.log("✓ Granted EXECUTOR_ROLE to zero address (anyone)");
  
  await timelock.grantRole(cancellerRole, governorAddress);
  console.log("✓ Granted CANCELLER_ROLE to Governor");

  // ===== SUMMARY =====
  console.log("\n═══════════════════════════════════════════════");
  console.log("DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log("\n📜 Core Governance:");
  console.log("   Token:      ", tokenAddress);
  console.log("   Timelock:   ", timelockAddress);
  console.log("   Governor:   ", governorAddress);
  console.log("   Treasury:   ", treasuryAddress);
  console.log("\n🔧 Ecosystem Contracts:");
  console.log("   Escrow:     ", escrowAddress);
  console.log("   Payroll:    ", payrollAddress);
  console.log("   Compliance: ", complianceAddress);
  console.log("   ESG:        ", esgAddress);

  console.log("\n📋 Environment Variables to Set:");
  console.log("─────────────────────────────────────────────");
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_TIMELOCK_ADDRESS=${timelockAddress}`);
  console.log(`NEXT_PUBLIC_GOVERNOR_ADDRESS=${governorAddress}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`NEXT_PUBLIC_PAYROLL_ADDRESS=${payrollAddress}`);
  console.log(`NEXT_PUBLIC_COMPLIANCE_ADDRESS=${complianceAddress}`);
  console.log(`NEXT_PUBLIC_ESG_ADDRESS=${esgAddress}`);
  console.log("─────────────────────────────────────────────");

  console.log("\n📋 Next Steps:");
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
