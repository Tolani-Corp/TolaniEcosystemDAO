const { run } = require("hardhat");

/**
 * Contract verification script for Etherscan
 * 
 * Run after deployment with the addresses from deploy-full.js output
 * Usage: npx hardhat run scripts/verify-contracts.js --network mainnet
 */

// Update these addresses after deployment
const ADDRESSES = {
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "",
  timelock: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS || "",
  governor: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS || "",
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "",
  escrow: process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "",
  payroll: process.env.NEXT_PUBLIC_PAYROLL_ADDRESS || "",
  compliance: process.env.NEXT_PUBLIC_COMPLIANCE_ADDRESS || "",
  esg: process.env.NEXT_PUBLIC_ESG_ADDRESS || "",
};

// Deployment parameters (must match what was used in deployment)
const MIN_DELAY = 3600;

async function verify(name, address, args = []) {
  console.log(`\nVerifying ${name} at ${address}...`);
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
    console.log(`✓ ${name} verified successfully`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✓ ${name} is already verified`);
    } else {
      console.log(`✗ ${name} verification failed:`, error.message);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("VERIFYING CONTRACTS ON ETHERSCAN");
  console.log("═══════════════════════════════════════════════");

  // Verify Timelock
  if (ADDRESSES.timelock) {
    await verify("TolaniEcosystemTimelock", ADDRESSES.timelock, [
      MIN_DELAY,
      [],
      [],
      ADDRESSES.timelock, // admin was deployer initially, now timelock itself
    ]);
  }

  // Verify Governor
  if (ADDRESSES.governor && ADDRESSES.token && ADDRESSES.timelock) {
    await verify("TolaniEcosystemGovernor", ADDRESSES.governor, [
      ADDRESSES.token,
      ADDRESSES.timelock,
    ]);
  }

  // Verify Treasury
  if (ADDRESSES.treasury && ADDRESSES.timelock) {
    await verify("TolaniTreasury", ADDRESSES.treasury, [ADDRESSES.timelock]);
  }

  // Verify Escrow
  if (ADDRESSES.escrow && ADDRESSES.token && ADDRESSES.timelock) {
    await verify("TolaniEscrow", ADDRESSES.escrow, [
      ADDRESSES.token,
      ADDRESSES.timelock,
    ]);
  }

  // Verify Payroll
  if (ADDRESSES.payroll && ADDRESSES.token && ADDRESSES.timelock) {
    await verify("TolaniPayroll", ADDRESSES.payroll, [
      ADDRESSES.token,
      ADDRESSES.timelock,
    ]);
  }

  // Verify Compliance
  if (ADDRESSES.compliance && ADDRESSES.timelock) {
    await verify("TolaniCompliance", ADDRESSES.compliance, [ADDRESSES.timelock]);
  }

  // Verify ESG
  if (ADDRESSES.esg && ADDRESSES.timelock) {
    await verify("TolaniESG", ADDRESSES.esg, [ADDRESSES.timelock]);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("VERIFICATION COMPLETE");
  console.log("═══════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
