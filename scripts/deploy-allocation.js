const { ethers } = require("hardhat");

// Existing contract addresses (Sepolia)
const EXISTING_CONTRACTS = {
  tutToken: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  governor: "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f",
  timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
  treasury: "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Allocation contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // ============ Deploy TokenAllocator ============
  console.log("\n--- Deploying TokenAllocator ---");
  const TokenAllocator = await ethers.getContractFactory("TokenAllocator");
  const tokenAllocator = await TokenAllocator.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await tokenAllocator.waitForDeployment();
  const tokenAllocatorAddr = await tokenAllocator.getAddress();
  console.log("TokenAllocator deployed to:", tokenAllocatorAddr);

  // ============ Deploy TrainingRewards ============
  console.log("\n--- Deploying TrainingRewards ---");
  const TrainingRewards = await ethers.getContractFactory("TrainingRewards");
  const trainingRewards = await TrainingRewards.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await trainingRewards.waitForDeployment();
  const trainingRewardsAddr = await trainingRewards.getAddress();
  console.log("TrainingRewards deployed to:", trainingRewardsAddr);

  // ============ Deploy VestingManager ============
  console.log("\n--- Deploying VestingManager ---");
  const VestingManager = await ethers.getContractFactory("VestingManager");
  const vestingManager = await VestingManager.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await vestingManager.waitForDeployment();
  const vestingManagerAddr = await vestingManager.getAddress();
  console.log("VestingManager deployed to:", vestingManagerAddr);

  // ============ Deploy TaskBounties ============
  console.log("\n--- Deploying TaskBounties ---");
  const TaskBounties = await ethers.getContractFactory("TaskBounties");
  const taskBounties = await TaskBounties.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await taskBounties.waitForDeployment();
  const taskBountiesAddr = await taskBounties.getAddress();
  console.log("TaskBounties deployed to:", taskBountiesAddr);

  // ============ Initialize Training Courses ============
  console.log("\n--- Creating Initial Training Courses ---");
  
  // Grant deployer INSTRUCTOR_ROLE temporarily
  const INSTRUCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSTRUCTOR_ROLE"));
  await trainingRewards.grantRole(INSTRUCTOR_ROLE, deployer.address);
  
  const courses = [
    { name: "DAO Basics", description: "Introduction to DAOs and governance", reward: ethers.parseEther("100"), maxCompletions: 10000 },
    { name: "TUT Token Guide", description: "Understanding TUT tokenomics", reward: ethers.parseEther("150"), maxCompletions: 10000 },
    { name: "Voting & Proposals", description: "How to participate in governance", reward: ethers.parseEther("200"), maxCompletions: 10000 },
    { name: "DeFi Fundamentals", description: "Learn about liquidity and staking", reward: ethers.parseEther("250"), maxCompletions: 5000 },
    { name: "Advanced Governance", description: "Creating and executing proposals", reward: ethers.parseEther("300"), maxCompletions: 2000 },
  ];

  for (const course of courses) {
    const tx = await trainingRewards.createCourse(
      course.name,
      course.description,
      course.reward,
      course.maxCompletions
    );
    await tx.wait();
    console.log(`  Created course: ${course.name} (${ethers.formatEther(course.reward)} TUT)`);
  }

  // ============ Initialize Vesting Category Limits ============
  console.log("\n--- Setting Vesting Category Limits ---");
  
  const VESTING_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_ADMIN_ROLE"));
  await vestingManager.grantRole(VESTING_ADMIN_ROLE, deployer.address);

  // Set category limits (founder: 100M, advisor: 30M, team: 70M)
  await vestingManager.setCategoryLimit(0, ethers.parseEther("100000000")); // FOUNDER
  await vestingManager.setCategoryLimit(1, ethers.parseEther("30000000"));  // ADVISOR
  await vestingManager.setCategoryLimit(2, ethers.parseEther("70000000"));  // TEAM
  console.log("  Set FOUNDER limit: 100,000,000 TUT");
  console.log("  Set ADVISOR limit: 30,000,000 TUT");
  console.log("  Set TEAM limit: 70,000,000 TUT");

  // ============ Summary ============
  console.log("\n========================================");
  console.log("Allocation Contracts Deployment Summary");
  console.log("========================================");
  console.log("");
  console.log("Deployed Contracts:");
  console.log("  TokenAllocator:", tokenAllocatorAddr);
  console.log("  TrainingRewards:", trainingRewardsAddr);
  console.log("  VestingManager:", vestingManagerAddr);
  console.log("  TaskBounties:", taskBountiesAddr);
  console.log("");
  console.log("Existing Contracts:");
  console.log("  TUT Token:", EXISTING_CONTRACTS.tutToken);
  console.log("  Governor:", EXISTING_CONTRACTS.governor);
  console.log("  Timelock:", EXISTING_CONTRACTS.timelock);
  console.log("  Treasury:", EXISTING_CONTRACTS.treasury);
  console.log("");
  console.log("Initial Setup:");
  console.log("  - 5 Training courses created");
  console.log("  - Vesting category limits set");
  console.log("");
  console.log("========================================");
  console.log("");
  console.log("Next Steps:");
  console.log("1. Fund TrainingRewards with TUT tokens");
  console.log("2. Fund VestingManager with TUT tokens");
  console.log("3. Fund TaskBounties with TUT tokens");
  console.log("4. Create governance proposal to allocate from Treasury");
  console.log("");

  return {
    tokenAllocator: tokenAllocatorAddr,
    trainingRewards: trainingRewardsAddr,
    vestingManager: vestingManagerAddr,
    taskBounties: taskBountiesAddr,
  };
}

main()
  .then((addresses) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
