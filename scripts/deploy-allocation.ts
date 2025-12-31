import { ethers } from "hardhat";
import { parseEther } from "ethers";

/**
 * Deploy Token Allocation Contracts
 * 
 * This script deploys:
 * 1. TokenAllocator - Master allocation pool manager
 * 2. TrainingRewards - Course completion rewards
 * 3. VestingManager - Founder/advisor vesting
 * 4. TaskBounties - L.O.E task rewards
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying allocation contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Contract addresses from previous deployment (Sepolia)
  const TUT_TOKEN = "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6";
  const TIMELOCK = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";

  console.log("\n=== Deploying Allocation Contracts ===\n");

  // 1. Deploy TokenAllocator
  console.log("1. Deploying TokenAllocator...");
  const TokenAllocator = await ethers.getContractFactory("TokenAllocator");
  const tokenAllocator = await TokenAllocator.deploy(TUT_TOKEN, TIMELOCK);
  await tokenAllocator.waitForDeployment();
  console.log("   TokenAllocator:", await tokenAllocator.getAddress());

  // 2. Deploy TrainingRewards
  console.log("2. Deploying TrainingRewards...");
  const TrainingRewards = await ethers.getContractFactory("TrainingRewards");
  const trainingRewards = await TrainingRewards.deploy(TUT_TOKEN, TIMELOCK);
  await trainingRewards.waitForDeployment();
  console.log("   TrainingRewards:", await trainingRewards.getAddress());

  // 3. Deploy VestingManager
  console.log("3. Deploying VestingManager...");
  const VestingManager = await ethers.getContractFactory("VestingManager");
  const vestingManager = await VestingManager.deploy(TUT_TOKEN, TIMELOCK);
  await vestingManager.waitForDeployment();
  console.log("   VestingManager:", await vestingManager.getAddress());

  // 4. Deploy TaskBounties
  console.log("4. Deploying TaskBounties...");
  const TaskBounties = await ethers.getContractFactory("TaskBounties");
  const taskBounties = await TaskBounties.deploy(TUT_TOKEN, TIMELOCK);
  await taskBounties.waitForDeployment();
  console.log("   TaskBounties:", await taskBounties.getAddress());

  console.log("\n=== Setting Up Initial Configuration ===\n");

  // Grant roles to deployer for initial setup (can be revoked later)
  const INSTRUCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSTRUCTOR_ROLE"));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  const TASK_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TASK_MANAGER_ROLE"));
  const REVIEWER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVIEWER_ROLE"));
  const VESTING_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VESTING_ADMIN_ROLE"));

  console.log("Granting roles to deployer for initial setup...");
  
  await trainingRewards.grantRole(INSTRUCTOR_ROLE, deployer.address);
  await trainingRewards.grantRole(MANAGER_ROLE, deployer.address);
  console.log("   ✓ TrainingRewards roles granted");

  await vestingManager.grantRole(VESTING_ADMIN_ROLE, deployer.address);
  console.log("   ✓ VestingManager roles granted");

  await taskBounties.grantRole(TASK_MANAGER_ROLE, deployer.address);
  await taskBounties.grantRole(REVIEWER_ROLE, deployer.address);
  console.log("   ✓ TaskBounties roles granted");

  // Create initial training courses
  console.log("\nCreating initial training courses...");
  
  await trainingRewards.createCourse(
    "DAO Fundamentals",
    parseEther("100"),  // 100 TUT reward
    0  // Unlimited completions
  );
  console.log("   ✓ Course 0: DAO Fundamentals (100 TUT)");

  await trainingRewards.createCourse(
    "Web3 Basics",
    parseEther("150"),
    0
  );
  console.log("   ✓ Course 1: Web3 Basics (150 TUT)");

  await trainingRewards.createCourse(
    "Smart Contract Security",
    parseEther("250"),
    0
  );
  console.log("   ✓ Course 2: Smart Contract Security (250 TUT)");

  await trainingRewards.createCourse(
    "Governance Participation",
    parseEther("200"),
    0
  );
  console.log("   ✓ Course 3: Governance Participation (200 TUT)");

  await trainingRewards.createCourse(
    "DeFi Deep Dive",
    parseEther("300"),
    0
  );
  console.log("   ✓ Course 4: DeFi Deep Dive (300 TUT)");

  // Set vesting category limits
  console.log("\nSetting vesting category limits...");
  
  await vestingManager.setCategoryLimit("founder", parseEther("100000000"));  // 100M TUT
  console.log("   ✓ Founder: 100,000,000 TUT");
  
  await vestingManager.setCategoryLimit("advisor", parseEther("30000000"));   // 30M TUT
  console.log("   ✓ Advisor: 30,000,000 TUT");
  
  await vestingManager.setCategoryLimit("team", parseEther("70000000"));      // 70M TUT
  console.log("   ✓ Team: 70,000,000 TUT");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nContracts Deployed:");
  console.log(`  TokenAllocator:   ${await tokenAllocator.getAddress()}`);
  console.log(`  TrainingRewards:  ${await trainingRewards.getAddress()}`);
  console.log(`  VestingManager:   ${await vestingManager.getAddress()}`);
  console.log(`  TaskBounties:     ${await taskBounties.getAddress()}`);
  
  console.log("\nExisting Contracts:");
  console.log(`  TUT Token:        ${TUT_TOKEN}`);
  console.log(`  Timelock:         ${TIMELOCK}`);

  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS");
  console.log("=".repeat(60));
  console.log(`
1. Fund contracts with TUT tokens:
   - Transfer TUT to TrainingRewards for course rewards
   - Transfer TUT to VestingManager for vesting schedules
   - Transfer TUT to TaskBounties for bounty rewards

2. Create governance proposal to:
   - Initialize TokenAllocator pools
   - Transfer allocated amounts from Treasury

3. Set up vesting schedules for founders:
   vestingManager.createVestingSchedule(
     founderAddress,
     amount,
     startTime,
     cliffDuration,  // e.g., 365 days
     vestingDuration, // e.g., 4 years
     true,  // revocable
     "founder"
   )

4. Create bounty tasks:
   taskBounties.createTask(
     "Build Discord Bot",
     "Create a bot to...",
     "development",
     parseEther("500"),
     2,  // MEDIUM difficulty
     0   // no deadline
   )

5. Update frontend to interact with new contracts
`);

  // Save addresses for frontend
  const addresses = {
    tokenAllocator: await tokenAllocator.getAddress(),
    trainingRewards: await trainingRewards.getAddress(),
    vestingManager: await vestingManager.getAddress(),
    taskBounties: await taskBounties.getAddress(),
  };

  console.log("\nAddresses JSON:");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
