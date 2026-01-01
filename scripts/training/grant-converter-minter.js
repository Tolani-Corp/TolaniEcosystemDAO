/**
 * Check and grant MINTER_ROLE to TUTConverter on uTUT
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const UTUT_ADDRESS = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";
const CONVERTER_ADDRESS = "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2";

const UTUT_ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n🔍 Checking MINTER_ROLE for TUTConverter...\n`);
  console.log(`Wallet: ${signer.address}`);

  const uTUT = new ethers.Contract(UTUT_ADDRESS, UTUT_ABI, signer);

  // Check MINTER_ROLE
  const MINTER_ROLE = await uTUT.MINTER_ROLE();
  console.log(`MINTER_ROLE: ${MINTER_ROLE}`);

  const hasMinter = await uTUT.hasRole(MINTER_ROLE, CONVERTER_ADDRESS);
  console.log(`\nConverter has MINTER_ROLE: ${hasMinter}`);

  if (!hasMinter) {
    // Check if we're admin
    const adminRole = await uTUT.DEFAULT_ADMIN_ROLE();
    const isAdmin = await uTUT.hasRole(adminRole, signer.address);
    console.log(`You have DEFAULT_ADMIN_ROLE: ${isAdmin}`);

    if (isAdmin) {
      console.log(`\n⏳ Granting MINTER_ROLE to converter...`);
      const tx = await uTUT.grantRole(MINTER_ROLE, CONVERTER_ADDRESS);
      console.log(`TX Hash: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ MINTER_ROLE granted!`);

      // Verify
      const newHasMinter = await uTUT.hasRole(MINTER_ROLE, CONVERTER_ADDRESS);
      console.log(`Converter now has MINTER_ROLE: ${newHasMinter}`);
    } else {
      console.log(`\n❌ You're not admin - cannot grant role`);
    }
  } else {
    console.log(`\n✅ Converter already has MINTER_ROLE`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
