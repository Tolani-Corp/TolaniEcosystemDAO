/**
 * Initialize TokenAllocator Pools
 * Run after GOVERNANCE_ROLE is granted via Timelock
 * 
 * TUT Token Allocation (100M Total Supply):
 * - TRAINING_REWARDS:     10% =  10,000,000 TUT (Learning & onboarding)
 * - TASK_BOUNTIES:        15% =  15,000,000 TUT (L.O.E task completion)
 * - ECOSYSTEM_GRANTS:     20% =  20,000,000 TUT (Project funding)
 * - COMMUNITY_INCENTIVES: 10% =  10,000,000 TUT (Airdrops, contests)
 * - RESERVE:              20% =  20,000,000 TUT (Emergency/future)
 * - TOLANI_FOUNDATION:    25% =  25,000,000 TUT (Sustainability)
 */

const { ethers } = require("hardhat");

// Contract addresses (Sepolia)
const CONTRACTS = {
  TUT: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  TokenAllocator: "0x2b3B2a6036099B144b0C5fB95a26b775785B3360",
  Timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
};

// Pool Categories (must match contract enum order)
const Category = {
  TRAINING_REWARDS: 0,
  TASK_BOUNTIES: 1,
  ECOSYSTEM_GRANTS: 2,
  COMMUNITY_INCENTIVES: 3,
  RESERVE: 4,
  TOLANI_FOUNDATION: 5,
};

// Pool allocations (in TUT, 18 decimals)
const POOL_LIMITS = {
  [Category.TRAINING_REWARDS]: ethers.parseEther("10000000"),     // 10M TUT
  [Category.TASK_BOUNTIES]: ethers.parseEther("15000000"),        // 15M TUT
  [Category.ECOSYSTEM_GRANTS]: ethers.parseEther("20000000"),     // 20M TUT
  [Category.COMMUNITY_INCENTIVES]: ethers.parseEther("10000000"), // 10M TUT
  [Category.RESERVE]: ethers.parseEther("20000000"),              // 20M TUT
  [Category.TOLANI_FOUNDATION]: ethers.parseEther("25000000"),    // 25M TUT
};

const CATEGORY_NAMES = [
  "TRAINING_REWARDS",
  "TASK_BOUNTIES",
  "ECOSYSTEM_GRANTS",
  "COMMUNITY_INCENTIVES",
  "RESERVE",
  "TOLANI_FOUNDATION",
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("INITIALIZE TOKEN ALLOCATOR POOLS");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  const allocator = await ethers.getContractAt("TokenAllocator", CONTRACTS.TokenAllocator);
  
  // Check if deployer has GOVERNANCE_ROLE
  const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const hasRole = await allocator.hasRole(GOVERNANCE_ROLE, deployer.address);
  
  if (!hasRole) {
    console.log(`\n❌ Deployer does NOT have GOVERNANCE_ROLE`);
    console.log(`   Run check-timelock-status.js first to execute the Timelock operation.`);
    process.exit(1);
  }
  
  console.log(`✅ Deployer has GOVERNANCE_ROLE`);

  // Check which pools are already initialized
  console.log(`\n📊 Current Pool Status:`);
  const uninitializedPools = [];
  
  for (let i = 0; i < CATEGORY_NAMES.length; i++) {
    const pool = await allocator.pools(i);
    const isInitialized = pool.limit > 0n;
    const status = isInitialized ? "✅ Initialized" : "⬜ Not initialized";
    console.log(`   ${CATEGORY_NAMES[i]}: ${status}`);
    
    if (!isInitialized) {
      uninitializedPools.push(i);
    }
  }

  if (uninitializedPools.length === 0) {
    console.log(`\n✅ All pools already initialized!`);
    return;
  }

  console.log(`\n🔧 Initializing ${uninitializedPools.length} pools...`);
  
  for (const category of uninitializedPools) {
    const limit = POOL_LIMITS[category];
    const limitFormatted = ethers.formatEther(limit);
    
    console.log(`\n   Initializing ${CATEGORY_NAMES[category]}...`);
    console.log(`   Limit: ${Number(limitFormatted).toLocaleString()} TUT`);
    
    const tx = await allocator.initializePool(category, limit);
    const receipt = await tx.wait();
    
    console.log(`   ✅ Done! Tx: ${receipt.hash}`);
  }

  // Final status
  console.log(`\n` + "=".repeat(60));
  console.log("FINAL POOL STATUS");
  console.log("=".repeat(60));
  
  let totalLimit = 0n;
  for (let i = 0; i < CATEGORY_NAMES.length; i++) {
    const pool = await allocator.pools(i);
    const limitFormatted = ethers.formatEther(pool.limit);
    console.log(`   ${CATEGORY_NAMES[i].padEnd(22)}: ${Number(limitFormatted).toLocaleString().padStart(15)} TUT`);
    totalLimit += pool.limit;
  }
  
  console.log(`   ${"─".repeat(40)}`);
  console.log(`   ${"TOTAL".padEnd(22)}: ${Number(ethers.formatEther(totalLimit)).toLocaleString().padStart(15)} TUT`);
  
  console.log(`\n✅ TokenAllocator pools initialized successfully!`);
  console.log(`\n📝 Next Steps:`);
  console.log(`   1. Fund pools with TUT tokens (transfer + fundPool)`);
  console.log(`   2. Grant ALLOCATOR_ROLE to distribution contracts`);
  console.log(`   3. Enable distributions from each pool`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
