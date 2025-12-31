const { run } = require("hardhat");

/**
 * Contract verification script for Etherscan - Sepolia
 */

const DEPLOYER = "0x753b53809360bec8742a235D8B60375a57965099";
const TOKEN = "0x6D07D1dC1750B9d939e1b503d7fa6Faa803e2eFb";

const ADDRESSES = {
  timelock: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  governor: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
  treasury: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
  escrow: "0x8be1b90e8E6A7025814Cf249031795D7fa89faFd",
  payroll: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
  compliance: "0xE253d4EeA0AB79d04a9ABca1257C7F2167886298",
  esg: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867",
};

const MIN_DELAY = 3600;

async function verify(name, address, constructorArguments, contract = undefined) {
  console.log(`\nVerifying ${name} at ${address}...`);
  try {
    const args = {
      address: address,
      constructorArguments: constructorArguments,
    };
    if (contract) {
      args.contract = contract;
    }
    await run("verify:verify", args);
    console.log(`✓ ${name} verified successfully`);
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log(`✓ ${name} is already verified`);
    } else {
      console.log(`✗ ${name} verification failed:`, error.message);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("VERIFYING CONTRACTS ON SEPOLIA ETHERSCAN");
  console.log("═══════════════════════════════════════════════");

  // Timelock
  await verify(
    "TolaniEcosystemTimelock",
    ADDRESSES.timelock,
    [MIN_DELAY, [], [], DEPLOYER],
    "contracts/TolaniTimelock.sol:TolaniEcosystemTimelock"
  );

  // Governor
  await verify(
    "TolaniEcosystemGovernor",
    ADDRESSES.governor,
    [TOKEN, ADDRESSES.timelock],
    "contracts/TolaniGovernor.sol:TolaniEcosystemGovernor"
  );

  // Treasury
  await verify(
    "TolaniTreasury",
    ADDRESSES.treasury,
    [ADDRESSES.timelock]
  );

  // Escrow
  await verify(
    "TolaniEscrow",
    ADDRESSES.escrow,
    [TOKEN, ADDRESSES.timelock]
  );

  // Payroll
  await verify(
    "TolaniPayroll",
    ADDRESSES.payroll,
    [TOKEN, ADDRESSES.timelock]
  );

  // Compliance
  await verify(
    "TolaniCompliance",
    ADDRESSES.compliance,
    [ADDRESSES.timelock]
  );

  // ESG
  await verify(
    "TolaniESG",
    ADDRESSES.esg,
    [ADDRESSES.timelock]
  );

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
