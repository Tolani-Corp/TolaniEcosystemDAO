/**
 * Transfer Admin Roles to Gnosis Safe
 * 
 * This script transfers DEFAULT_ADMIN_ROLE from the current admin (CUSTODY)
 * to the Gnosis Safe multisig for enhanced security.
 * 
 * ⚠️  WARNING: This is a ONE-WAY operation! Once transferred, only the Safe
 *     can manage roles. Make sure your Safe is properly configured first.
 * 
 * Usage:
 *   npx hardhat run scripts/transfer-admin-to-safe.js --network baseSepolia
 *   npx hardhat run scripts/transfer-admin-to-safe.js --network sepolia
 * 
 * Flags:
 *   DRY_RUN=true npx hardhat run ... (preview only, no transactions)
 */

const { ethers } = require("hardhat");

// Configuration
const SAFE_ADDRESS = process.env.GNOSIS_SAFE_ADDRESS || "0xa56eb5E3990C740C8c58F02eAD263feF02567677";
const DRY_RUN = process.env.DRY_RUN === "true";

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
    TokenAllocator: "0x2b3B2a6036099B144b0C5fB95a26b775785B3360"
  }
};

const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function transferAdmin(contractName, contractAddress, signer) {
  console.log(`\n   ${contractName} (${contractAddress}):`);
  
  try {
    // Use generic AccessControl ABI
    const contract = await ethers.getContractAt(
      ["function hasRole(bytes32,address) view returns (bool)", 
       "function grantRole(bytes32,address)", 
       "function renounceRole(bytes32,address)"],
      contractAddress
    );
    
    // Check if Safe already has admin
    const safeHasAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
    const signerHasAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
    
    if (!signerHasAdmin) {
      console.log(`     ⚠️  Signer is not admin, skipping`);
      return { success: false, reason: "not_admin" };
    }
    
    if (safeHasAdmin) {
      console.log(`     ✅ Safe already has admin role`);
      return { success: true, reason: "already_done" };
    }
    
    if (DRY_RUN) {
      console.log(`     🔍 [DRY RUN] Would grant admin to Safe`);
      console.log(`     🔍 [DRY RUN] Would renounce admin from signer`);
      return { success: true, reason: "dry_run" };
    }
    
    // Grant admin to Safe
    console.log(`     📤 Granting admin to Safe...`);
    const grantTx = await contract.grantRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
    await grantTx.wait();
    console.log(`     ✅ Admin granted: ${grantTx.hash}`);
    
    // Optionally renounce (commented out for safety - uncomment when ready)
    // console.log(`     📤 Renouncing admin from signer...`);
    // const renounceTx = await contract.renounceRole(DEFAULT_ADMIN_ROLE, signer.address);
    // await renounceTx.wait();
    // console.log(`     ✅ Admin renounced: ${renounceTx.hash}`);
    
    console.log(`     ⚠️  Note: Signer still has admin. Run renounce separately when ready.`);
    
    return { success: true, reason: "transferred" };
    
  } catch (e) {
    console.log(`     ❌ Error: ${e.message}`);
    return { success: false, reason: e.message };
  }
}

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "baseSepolia" : network.name;
  
  console.log("=".repeat(60));
  console.log("TRANSFER ADMIN ROLES TO GNOSIS SAFE");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no transactions)" : "⚡ LIVE"}`);
  console.log("");
  
  if (!DRY_RUN) {
    console.log("⚠️  WARNING: This will grant admin roles to the Safe!");
    console.log("   The signer will retain admin until manually renounced.");
    console.log("");
  }
  
  const contracts = CONTRACTS[networkName] || CONTRACTS.baseSepolia;
  const results = {};
  
  console.log("📋 Processing contracts...");
  
  for (const [name, address] of Object.entries(contracts)) {
    results[name] = await transferAdmin(name, address, signer);
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  
  const transferred = Object.entries(results).filter(([_, r]) => r.reason === "transferred").length;
  const alreadyDone = Object.entries(results).filter(([_, r]) => r.reason === "already_done").length;
  const skipped = Object.entries(results).filter(([_, r]) => r.reason === "not_admin").length;
  const failed = Object.entries(results).filter(([_, r]) => !r.success && r.reason !== "not_admin").length;
  
  console.log(`✅ Transferred: ${transferred}`);
  console.log(`✅ Already done: ${alreadyDone}`);
  console.log(`⏭️  Skipped (not admin): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (!DRY_RUN && transferred > 0) {
    console.log("\n📝 Next Steps:");
    console.log("   1. Verify Safe has admin: check on safe.global");
    console.log("   2. Test Safe can grant/revoke roles");
    console.log("   3. When ready, renounce signer's admin role");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
