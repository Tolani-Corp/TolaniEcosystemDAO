/**
 * Grant GOVERNANCE_ROLE to deployer on TokenAllocator
 * One-time setup script
 */

const { ethers } = require("hardhat");

async function main() {
  const allocatorAddress = "0x2b3B2a6036099B144b0C5fB95a26b775785B3360";
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const allocator = await ethers.getContractAt("TokenAllocator", allocatorAddress);
  
  // Check roles
  const DEFAULT_ADMIN_ROLE = await allocator.DEFAULT_ADMIN_ROLE();
  const GOVERNANCE_ROLE = await allocator.GOVERNANCE_ROLE();
  
  console.log("\nRole hashes:");
  console.log("  DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("  GOVERNANCE_ROLE:", GOVERNANCE_ROLE);
  
  const hasAdmin = await allocator.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  const hasGov = await allocator.hasRole(GOVERNANCE_ROLE, signer.address);
  
  console.log("\nCurrent roles:");
  console.log("  Has DEFAULT_ADMIN_ROLE:", hasAdmin);
  console.log("  Has GOVERNANCE_ROLE:", hasGov);
  
  if (hasGov) {
    console.log("\n✅ Already has GOVERNANCE_ROLE!");
    return;
  }
  
  if (!hasAdmin) {
    // Check if Timelock has admin
    const timelockAddress = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";
    const timelockHasAdmin = await allocator.hasRole(DEFAULT_ADMIN_ROLE, timelockAddress);
    console.log("  Timelock has admin:", timelockHasAdmin);
    
    if (timelockHasAdmin) {
      console.log("\n⚠️  Admin role is with Timelock. Need governance proposal to grant role.");
      console.log("   Or grant role directly if you control the Timelock.");
    }
    return;
  }
  
  // Grant GOVERNANCE_ROLE to signer
  console.log("\n🔄 Granting GOVERNANCE_ROLE...");
  const tx = await allocator.grantRole(GOVERNANCE_ROLE, signer.address);
  console.log("   Tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ GOVERNANCE_ROLE granted!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
