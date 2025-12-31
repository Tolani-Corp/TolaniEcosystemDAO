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
  console.log("Deploying updated TokenAllocator with Foundation category");
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // ============ Deploy Updated TokenAllocator ============
  console.log("\n--- Deploying TokenAllocator (with TOLANI_FOUNDATION) ---");
  const TokenAllocator = await ethers.getContractFactory("TokenAllocator");
  const tokenAllocator = await TokenAllocator.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await tokenAllocator.waitForDeployment();
  const tokenAllocatorAddr = await tokenAllocator.getAddress();
  console.log("TokenAllocator deployed to:", tokenAllocatorAddr);

  // ============ Summary ============
  console.log("\n========================================");
  console.log("Updated TokenAllocator Deployment Summary");
  console.log("========================================");
  console.log(`TokenAllocator: ${tokenAllocatorAddr}`);
  console.log("\nNew Category Available:");
  console.log("  - TOLANI_FOUNDATION (index: 5)");
  console.log("\nPrevious Categories:");
  console.log("  - TRAINING_REWARDS (0)");
  console.log("  - TASK_BOUNTIES (1)");
  console.log("  - ECOSYSTEM_GRANTS (2)");
  console.log("  - COMMUNITY_INCENTIVES (3)");
  console.log("  - RESERVE (4)");
  console.log("\nUpdate frontend/src/config/contracts.ts with new address!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
