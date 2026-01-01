/**
 * Setup Wallet Roles for Tolani DAO
 * 
 * Grants appropriate roles to different wallets:
 * - OPS wallet: RELAYER_ROLE on GasTreasuryModule
 * - Safe: DEFAULT_ADMIN_ROLE on all contracts (optional, for mainnet)
 * 
 * Usage:
 *   npx hardhat run scripts/setup-wallet-roles.js --network baseSepolia
 *   npx hardhat run scripts/setup-wallet-roles.js --network sepolia
 */

const { ethers } = require("hardhat");

// Wallet addresses from .env
const WALLETS = {
  CUSTODY: process.env.METAMASK_WALLET_CUSTODY || "0x753b53809360bec8742a235D8B60375a57965099",
  DEPLOYER: process.env.METAMASK_WALLET_DEPLOYER || "0xAdBcb3Ba539b741c386d28705858Af699856B928",
  OPS: process.env.METAMASK_WALLET_OPS || "0x4d03F26dfe964dAd3C54130667d5344D30D211aB",
  FOUNDER: process.env.METAMASK_WALLET_FOUNDER || "0xA484fC94908c821A18d60312F620B135D1b55235",
  TEST: process.env.METAMASK_WALLET_TEST || "0x3203009FC71927c8484645B3dF17863d1eF3A21a",
  SAFE: process.env.GNOSIS_SAFE_ADDRESS || "0xa56eb5E3990C740C8c58F02eAD263feF02567677"
};

// Contract addresses by network
const CONTRACTS = {
  baseSepolia: {
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
    SessionKeyRegistry: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
    GasTreasuryModule: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
    TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
    SessionInvoker: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867"
  },
  sepolia: {
    uTUT: "0xc9D0D68aC9A4678Fb58CB7AE5c4c6b0B7cf60E38",
    TUTConverter: "0x82D131Fbf9aC7629499cC05DA21b7dD317e5748D",
    SessionKeyRegistry: "0xF9e6A163852D7B73B8F5A13cAbAe529C5b4c4c27",
    GasTreasuryModule: "0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd",
    TrainingRewards: "0x6C5892afBdf60123edd408404347E59F72D4Eb4c",
    SessionInvoker: "0x46Fc54f90023098655b237E3543609BF8dCB938e",
    TUTToken: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
    Governor: "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f",
    Timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
    Treasury: "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
    TokenAllocator: "0x2b3B2a6036099B144b0C5fB95a26b775785B3360"
  }
};

// Role definitions
const ROLES = {
  DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  RELAYER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE")),
  TREASURER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("TREASURER_ROLE")),
  REWARDER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REWARDER_ROLE")),
  INVOKER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("INVOKER_ROLE")),
  CAMPAIGN_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"))
};

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "baseSepolia" : network.name;
  
  console.log("=".repeat(60));
  console.log("TOLANI DAO - WALLET ROLE SETUP");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Signer: ${signer.address}`);
  console.log("");
  
  console.log("📋 Wallet Configuration:");
  console.log(`   CUSTODY:  ${WALLETS.CUSTODY}`);
  console.log(`   DEPLOYER: ${WALLETS.DEPLOYER}`);
  console.log(`   OPS:      ${WALLETS.OPS}`);
  console.log(`   FOUNDER:  ${WALLETS.FOUNDER}`);
  console.log(`   TEST:     ${WALLETS.TEST}`);
  console.log(`   SAFE:     ${WALLETS.SAFE}`);
  console.log("");

  const contracts = CONTRACTS[networkName] || CONTRACTS.baseSepolia;
  
  // ============================================
  // 1. Grant RELAYER_ROLE to OPS wallet
  // ============================================
  console.log("1️⃣  Granting RELAYER_ROLE to OPS wallet...");
  
  try {
    const gasTreasury = await ethers.getContractAt("GasTreasuryModuleSimple", contracts.GasTreasuryModule);
    
    const hasRelayer = await gasTreasury.hasRole(ROLES.RELAYER_ROLE, WALLETS.OPS);
    if (hasRelayer) {
      console.log("   ✅ OPS already has RELAYER_ROLE");
    } else {
      const tx = await gasTreasury.grantRole(ROLES.RELAYER_ROLE, WALLETS.OPS);
      await tx.wait();
      console.log(`   ✅ RELAYER_ROLE granted to OPS: ${tx.hash}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // ============================================
  // 2. Grant TREASURER_ROLE to CUSTODY (admin)
  // ============================================
  console.log("\n2️⃣  Granting TREASURER_ROLE to CUSTODY wallet...");
  
  try {
    const gasTreasury = await ethers.getContractAt("GasTreasuryModuleSimple", contracts.GasTreasuryModule);
    
    const hasTreasurer = await gasTreasury.hasRole(ROLES.TREASURER_ROLE, WALLETS.CUSTODY);
    if (hasTreasurer) {
      console.log("   ✅ CUSTODY already has TREASURER_ROLE");
    } else {
      const tx = await gasTreasury.grantRole(ROLES.TREASURER_ROLE, WALLETS.CUSTODY);
      await tx.wait();
      console.log(`   ✅ TREASURER_ROLE granted to CUSTODY: ${tx.hash}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // ============================================
  // 3. Check all current roles
  // ============================================
  console.log("\n3️⃣  Current Role Summary:");
  console.log("-".repeat(60));
  
  // GasTreasuryModule
  try {
    const gasTreasury = await ethers.getContractAt("GasTreasuryModuleSimple", contracts.GasTreasuryModule);
    console.log("\n   GasTreasuryModule:");
    console.log(`     CUSTODY  - ADMIN: ${await gasTreasury.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}, TREASURER: ${await gasTreasury.hasRole(ROLES.TREASURER_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}`);
    console.log(`     OPS      - RELAYER: ${await gasTreasury.hasRole(ROLES.RELAYER_ROLE, WALLETS.OPS) ? "✅" : "❌"}`);
    console.log(`     SAFE     - ADMIN: ${await gasTreasury.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.SAFE) ? "✅" : "❌"}`);
  } catch (e) {
    console.log(`   GasTreasuryModule: Error - ${e.message}`);
  }

  // TrainingRewards
  try {
    const rewards = await ethers.getContractAt("TrainingRewardsSimple", contracts.TrainingRewards);
    console.log("\n   TrainingRewards:");
    console.log(`     CUSTODY  - ADMIN: ${await rewards.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}, CAMPAIGN_MGR: ${await rewards.hasRole(ROLES.CAMPAIGN_MANAGER_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}`);
    console.log(`     SAFE     - ADMIN: ${await rewards.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.SAFE) ? "✅" : "❌"}`);
  } catch (e) {
    console.log(`   TrainingRewards: Error - ${e.message}`);
  }

  // uTUT
  try {
    const uTUT = await ethers.getContractAt("uTUTSimple", contracts.uTUT);
    console.log("\n   uTUT Token:");
    console.log(`     CUSTODY  - ADMIN: ${await uTUT.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}`);
    console.log(`     SAFE     - ADMIN: ${await uTUT.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.SAFE) ? "✅" : "❌"}`);
  } catch (e) {
    console.log(`   uTUT: Error - ${e.message}`);
  }

  // SessionKeyRegistry
  try {
    const registry = await ethers.getContractAt("SessionKeyRegistrySimple", contracts.SessionKeyRegistry);
    console.log("\n   SessionKeyRegistry:");
    console.log(`     CUSTODY  - ADMIN: ${await registry.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.CUSTODY) ? "✅" : "❌"}`);
    console.log(`     SAFE     - ADMIN: ${await registry.hasRole(ROLES.DEFAULT_ADMIN_ROLE, WALLETS.SAFE) ? "✅" : "❌"}`);
  } catch (e) {
    console.log(`   SessionKeyRegistry: Error - ${e.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("ROLE SETUP COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
