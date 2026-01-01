/**
 * Check and fix uTUT converter setting
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const UTUT_ADDRESS = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";
const CONVERTER_ADDRESS = "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2";

const UTUT_ABI = [
  "function converter() view returns (address)",
  "function setConverter(address) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n🔍 Checking uTUT converter setting...\n`);
  console.log(`Wallet: ${signer.address}`);

  const uTUT = new ethers.Contract(UTUT_ADDRESS, UTUT_ABI, signer);

  // Check current converter
  const currentConverter = await uTUT.converter();
  console.log(`\nCurrent converter: ${currentConverter}`);
  console.log(`Expected converter: ${CONVERTER_ADDRESS}`);

  if (currentConverter.toLowerCase() === CONVERTER_ADDRESS.toLowerCase()) {
    console.log(`\n✅ Converter is already set correctly!`);
  } else {
    // Check if we're admin
    const adminRole = await uTUT.DEFAULT_ADMIN_ROLE();
    const isAdmin = await uTUT.hasRole(adminRole, signer.address);
    console.log(`\nIs admin: ${isAdmin}`);

    if (isAdmin) {
      console.log(`\n⏳ Setting converter to ${CONVERTER_ADDRESS}...`);
      const tx = await uTUT.setConverter(CONVERTER_ADDRESS);
      console.log(`TX Hash: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Converter set!`);

      // Verify
      const newConverter = await uTUT.converter();
      console.log(`New converter: ${newConverter}`);
    } else {
      console.log(`\n❌ Not admin - cannot set converter`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
