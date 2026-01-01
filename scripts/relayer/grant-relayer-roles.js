/**
 * Grant Relayer Roles to OPS Wallet
 * 
 * Grants RELAYER_ROLE and OPERATOR_ROLE to OPS wallet for relayer operations
 * 
 * Usage:
 *   npx hardhat run scripts/relayer/grant-relayer-roles.js --network baseSepolia
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
  baseSepolia: {
    SessionKeyRegistry: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
    SessionInvoker: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867"
  }
};

const OPS_WALLET = process.env.METAMASK_WALLET_OPS || "0x4d03F26dfe964dAd3C54130667d5344D30D211aB";

async function main() {
  const [admin] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("=".repeat(50));
  console.log("GRANT RELAYER ROLES TO OPS WALLET");
  console.log("=".repeat(50));
  console.log(`Admin: ${admin.address}`);
  console.log(`OPS Wallet: ${OPS_WALLET}`);
  console.log("");

  const contracts = CONTRACTS.baseSepolia;
  
  // Grant OPERATOR_ROLE on SessionKeyRegistry
  console.log("1️⃣  SessionKeyRegistry - OPERATOR_ROLE");
  const registry = await ethers.getContractAt("SessionKeyRegistrySimple", contracts.SessionKeyRegistry);
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  
  const hasOperator = await registry.hasRole(OPERATOR_ROLE, OPS_WALLET);
  if (hasOperator) {
    console.log("   ✅ Already has OPERATOR_ROLE");
  } else {
    const tx1 = await registry.grantRole(OPERATOR_ROLE, OPS_WALLET);
    await tx1.wait();
    console.log(`   ✅ Granted: ${tx1.hash}`);
  }

  // Grant RELAYER_ROLE on SessionInvoker
  console.log("\n2️⃣  SessionInvoker - RELAYER_ROLE");
  const invoker = await ethers.getContractAt("SessionInvokerSimple", contracts.SessionInvoker);
  const RELAYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE"));
  
  const hasRelayer = await invoker.hasRole(RELAYER_ROLE, OPS_WALLET);
  if (hasRelayer) {
    console.log("   ✅ Already has RELAYER_ROLE");
  } else {
    const tx2 = await invoker.grantRole(RELAYER_ROLE, OPS_WALLET);
    await tx2.wait();
    console.log(`   ✅ Granted: ${tx2.hash}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("OPS wallet ready for relayer operations!");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
