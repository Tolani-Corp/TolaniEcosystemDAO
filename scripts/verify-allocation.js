const { ethers } = require("hardhat");

// Existing contract addresses (Sepolia)
const EXISTING_CONTRACTS = {
  tutToken: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  governor: "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f",
  timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
  treasury: "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
};

// Already deployed allocation contracts
const ALLOCATION_CONTRACTS = {
  tokenAllocator: "0xc43eECDba896c44159Ce5d3cf87B2f1b777f9552",
  trainingRewards: "0x27D6Dd0797a3F4e5fa90A0214B06AEF4528a0596",
  vestingManager: "0x4185218AC05736bd5903A4E4A6765B24EabF4c62",
  taskBounties: "0x19ba97DFF787916bA064E33000225b4e725e50fB",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up Allocation contracts with account:", deployer.address);

  // Load contracts
  const trainingRewards = await ethers.getContractAt("TrainingRewards", ALLOCATION_CONTRACTS.trainingRewards);
  const vestingManager = await ethers.getContractAt("VestingManager", ALLOCATION_CONTRACTS.vestingManager);

  // Check admin role
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const INSTRUCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSTRUCTOR_ROLE"));
  const VESTING_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_ADMIN_ROLE"));

  console.log("\nChecking roles...");
  console.log("DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("INSTRUCTOR_ROLE:", INSTRUCTOR_ROLE);
  console.log("VESTING_ADMIN_ROLE:", VESTING_ADMIN_ROLE);

  // Check if timelock is admin
  const timelockIsAdmin = await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, EXISTING_CONTRACTS.timelock);
  console.log("\nTimelock is admin of TrainingRewards:", timelockIsAdmin);

  const deployerIsAdmin = await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log("Deployer is admin of TrainingRewards:", deployerIsAdmin);

  // The timelock is the admin, so setup needs to happen via governance proposals
  console.log("\n========================================");
  console.log("IMPORTANT: Setup requires governance");
  console.log("========================================");
  console.log("");
  console.log("The Timelock contract is the admin of all allocation contracts.");
  console.log("To set up courses and vesting limits, create governance proposals:");
  console.log("");
  console.log("1. Grant INSTRUCTOR_ROLE to an instructor address");
  console.log("2. Create training courses");
  console.log("3. Set vesting category limits");
  console.log("4. Fund contracts with TUT tokens");
  console.log("");

  console.log("Deployed Allocation Contracts:");
  console.log("  TokenAllocator:", ALLOCATION_CONTRACTS.tokenAllocator);
  console.log("  TrainingRewards:", ALLOCATION_CONTRACTS.trainingRewards);
  console.log("  VestingManager:", ALLOCATION_CONTRACTS.vestingManager);
  console.log("  TaskBounties:", ALLOCATION_CONTRACTS.taskBounties);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
