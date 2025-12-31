#!/usr/bin/env node
/**
 * TUT Tokenomics Status & Health Check
 * Tolani Ecosystem DAO
 * 
 * Displays current token distribution status, pool balances,
 * and system health across all tokenomics components.
 * 
 * Usage:
 *   npx hardhat run scripts/tokenomics/status.js --network <network>
 */

const { ethers } = require("hardhat");
const { TOKEN_CONFIG, LIQUIDITY_CONFIG, BOOTSTRAP_ALLOCATION } = require("./config");

// Pool categories
const Category = {
  TRAINING_REWARDS: 0,
  TASK_BOUNTIES: 1,
  ECOSYSTEM_GRANTS: 2,
  COMMUNITY_INCENTIVES: 3,
  RESERVE: 4,
  TOLANI_FOUNDATION: 5,
};

const CATEGORY_NAMES = [
  "Training Rewards",
  "Task Bounties",
  "Ecosystem Grants",
  "Community Incentives",
  "Reserve",
  "Tolani Foundation",
];

async function main() {
  console.log("\n📊 TUT TOKENOMICS STATUS REPORT");
  console.log("================================");
  console.log(`Generated: ${new Date().toISOString()}\n`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Get addresses from environment or hardcoded for Sepolia
  let addresses;
  
  // Sepolia addresses (from frontend config)
  const SEPOLIA_ADDRESSES = {
    governor: '0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f',
    timelock: '0x9d0ccD1371B3a1f570B353c46840C268Aac57872',
    treasury: '0xBB9d207ee665e9680458F2E451098f23D707Ad25',
    token: '0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6',
    escrow: '0x8be1b90e8E6A7025814Cf249031795D7fa89faFd',
    payroll: '0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC',
    compliance: '0xE253d4EeA0AB79d04a9ABca1257C7F2167886298',
    esg: '0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867',
    tokenAllocator: '0x2b3B2a6036099B144b0C5fB95a26b775785B3360',
    trainingRewards: '0x27D6Dd0797a3F4e5fa90A0214B06AEF4528a0596',
    vestingManager: '0x4185218AC05736bd5903A4E4A6765B24EabF4c62',
    taskBounties: '0x19ba97DFF787916bA064E33000225b4e725e50fB',
    stakingPool: '0x50E0660068d2D3939e1b503d7fa6Faa803e2eFb',
    liquidityManager: '0xbAFAD13BAAF482bBE58D3949ABd05dAD64C051cB',
    liquidityIncentives: '0x09cCCc3D8F9D1269Fd6bd8C83fE448de37D46031',
  };
  
  if (chainId === 11155111) {
    addresses = SEPOLIA_ADDRESSES;
  } else {
    try {
      const { CONTRACT_ADDRESSES } = require("../../frontend/src/config/contracts");
      addresses = CONTRACT_ADDRESSES[chainId];
    } catch (e) {
      console.error("❌ Could not load contract addresses!");
      process.exit(1);
    }
  }
  
  if (!addresses) {
    console.error(`❌ No addresses configured for chain ${chainId}`);
    process.exit(1);
  }
  
  // ============================================================
  // TOKEN STATUS
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("TOKEN STATUS");
  console.log("═".repeat(60));
  
  const TUT = await ethers.getContractAt("TUTTokenReference", addresses.token);
  
  const totalSupply = await TUT.totalSupply();
  const cap = await TUT.cap();
  const name = await TUT.name();
  const symbol = await TUT.symbol();
  
  console.log(`\n  ${name} (${symbol})`);
  console.log(`  Address:      ${addresses.token}`);
  console.log(`  Total Supply: ${ethers.formatEther(totalSupply).padStart(16)} TUT`);
  console.log(`  Max Cap:      ${ethers.formatEther(cap).padStart(16)} TUT`);
  console.log(`  Minted:       ${((Number(totalSupply) / Number(cap)) * 100).toFixed(2)}%`);
  console.log(`  Remaining:    ${ethers.formatEther(cap - totalSupply).padStart(16)} TUT`);
  
  // Check key holder balances
  console.log(`\n  Key Balances:`);
  
  const keyHolders = [
    { name: "Treasury", address: addresses.treasury },
    { name: "Timelock", address: addresses.timelock },
  ];
  
  for (const holder of keyHolders) {
    if (holder.address) {
      const balance = await TUT.balanceOf(holder.address);
      console.log(`    ${holder.name.padEnd(12)} ${ethers.formatEther(balance).padStart(16)} TUT`);
    }
  }
  
  // ============================================================
  // STAKING STATUS
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("STAKING STATUS");
  console.log("═".repeat(60));
  
  if (addresses.stakingPool) {
    try {
      const StakingPool = await ethers.getContractAt("StakingPool", addresses.stakingPool);
      
      const totalStaked = await StakingPool.totalStaked();
      const rewardRate = await StakingPool.rewardRate();
      const rewardsEndTime = await StakingPool.rewardsEndTime();
      const totalDistributed = await StakingPool.totalRewardsDistributed();
      
      const rewardsActive = BigInt(Math.floor(Date.now() / 1000)) < rewardsEndTime;
      
      console.log(`\n  Address:         ${addresses.stakingPool}`);
      console.log(`  Total Staked:    ${ethers.formatEther(totalStaked).padStart(16)} TUT`);
      console.log(`  Rewards Active:  ${rewardsActive ? "✅ Yes" : "❌ No"}`);
      console.log(`  Reward Rate:     ${ethers.formatEther(rewardRate * 86400n).padStart(16)} TUT/day`);
      console.log(`  Total Paid Out:  ${ethers.formatEther(totalDistributed).padStart(16)} TUT`);
      
      if (rewardsActive) {
        const remaining = rewardsEndTime - BigInt(Math.floor(Date.now() / 1000));
        const daysRemaining = Number(remaining) / 86400;
        console.log(`  Ends In:         ${daysRemaining.toFixed(1)} days`);
      }
    } catch (e) {
      console.log(`\n  ⚠️  Staking pool not accessible: ${e.message}`);
    }
  } else {
    console.log(`\n  ⚠️  Staking pool not deployed (Target: Late 2026)`);
  }
  
  // ============================================================
  // ALLOCATOR STATUS
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("ALLOCATION POOLS");
  console.log("═".repeat(60));
  
  if (addresses.tokenAllocator) {
    try {
      const TokenAllocator = await ethers.getContractAt("TokenAllocator", addresses.tokenAllocator);
      
      console.log(`\n  Address: ${addresses.tokenAllocator}\n`);
      console.log(`  ${"Pool".padEnd(22)} | ${"Allocated".padStart(14)} | ${"Distributed".padStart(14)} | ${"Available".padStart(14)} | Active`);
      console.log("  " + "─".repeat(90));
      
      let totalAllocated = 0n;
      let totalDistributed = 0n;
      
      for (let i = 0; i < CATEGORY_NAMES.length; i++) {
        try {
          const info = await TokenAllocator.getPoolInfo(i);
          totalAllocated += info.allocated;
          totalDistributed += info.distributed;
          
          console.log(`  ${CATEGORY_NAMES[i].padEnd(22)} | ${ethers.formatEther(info.allocated).padStart(14)} | ${ethers.formatEther(info.distributed).padStart(14)} | ${ethers.formatEther(info.available).padStart(14)} | ${info.active ? "✅" : "❌"}`);
        } catch (e) {
          console.log(`  ${CATEGORY_NAMES[i].padEnd(22)} | Not initialized`);
        }
      }
      
      console.log("  " + "─".repeat(90));
      console.log(`  ${"TOTAL".padEnd(22)} | ${ethers.formatEther(totalAllocated).padStart(14)} | ${ethers.formatEther(totalDistributed).padStart(14)} | ${ethers.formatEther(totalAllocated - totalDistributed).padStart(14)} |`);
      
    } catch (e) {
      console.log(`\n  ⚠️  TokenAllocator not accessible: ${e.message}`);
    }
  } else {
    console.log(`\n  ⚠️  TokenAllocator not deployed`);
  }
  
  // ============================================================
  // PRICE & LIQUIDITY (Estimated)
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("PRICE & LIQUIDITY (Planned)");
  console.log("═".repeat(60));
  
  console.log(`\n  Target Launch:     Late 2026`);
  console.log(`  Initial USD:       $${LIQUIDITY_CONFIG.targetUSD.toLocaleString()}`);
  console.log(`  TUT for Liquidity: ${ethers.formatEther(LIQUIDITY_CONFIG.tutAllocation)} TUT`);
  console.log(`  Target Price:      $${LIQUIDITY_CONFIG.tutPrice.toFixed(4)} per TUT`);
  console.log(`  Initial FDV:       $${LIQUIDITY_CONFIG.initialFDV.toLocaleString()}`);
  
  // ============================================================
  // GOVERNANCE ROLES
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("GOVERNANCE ROLES");
  console.log("═".repeat(60));
  
  const MINTER_ROLE = await TUT.MINTER_ROLE();
  const PAUSER_ROLE = await TUT.PAUSER_ROLE();
  const DEFAULT_ADMIN_ROLE = await TUT.DEFAULT_ADMIN_ROLE();
  
  const checkRole = async (role, roleName) => {
    const holders = [];
    // Check common addresses
    const toCheck = [
      { name: "Treasury", addr: addresses.treasury },
      { name: "Timelock", addr: addresses.timelock },
    ];
    
    for (const { name, addr } of toCheck) {
      if (addr) {
        try {
          const hasRole = await TUT.hasRole(role, addr);
          if (hasRole) holders.push(name);
        } catch (e) {}
      }
    }
    
    return holders;
  };
  
  console.log(`\n  MINTER_ROLE:       ${(await checkRole(MINTER_ROLE, "MINTER")).join(", ") || "None"}`);
  console.log(`  PAUSER_ROLE:       ${(await checkRole(PAUSER_ROLE, "PAUSER")).join(", ") || "None"}`);
  console.log(`  DEFAULT_ADMIN:     ${(await checkRole(DEFAULT_ADMIN_ROLE, "ADMIN")).join(", ") || "None"}`);
  
  // ============================================================
  // HEALTH CHECK
  // ============================================================
  
  console.log("\n" + "═".repeat(60));
  console.log("HEALTH CHECK");
  console.log("═".repeat(60));
  
  const checks = [];
  
  // Supply check
  checks.push({
    name: "Supply under cap",
    pass: totalSupply <= cap,
    detail: `${ethers.formatEther(totalSupply)} / ${ethers.formatEther(cap)}`,
  });
  
  // Initial supply check
  const initialMinted = totalSupply >= TOKEN_CONFIG.initialSupply;
  checks.push({
    name: "Initial supply minted",
    pass: initialMinted,
    detail: initialMinted ? "50M TUT" : `Only ${ethers.formatEther(totalSupply)} TUT`,
  });
  
  console.log(`\n`);
  for (const check of checks) {
    console.log(`  ${check.pass ? "✅" : "❌"} ${check.name.padEnd(25)} ${check.detail}`);
  }
  
  console.log("\n" + "═".repeat(60));
  console.log(`Report generated at ${new Date().toISOString()}`);
  console.log("═".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
