/**
 * Debug TUTConverter Contract on Base Sepolia
 */

require("dotenv").config();
const { ethers } = require("hardhat");

const CONVERTER_ADDRESS = "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2";

async function main() {
  console.log("\n🔍 DEBUGGING TUTConverter\n");

  const [signer] = await ethers.getSigners();
  
  // Try to read storage slots directly
  const provider = ethers.provider;
  
  // Read first few storage slots
  for (let i = 0; i < 10; i++) {
    const slot = await provider.getStorage(CONVERTER_ADDRESS, i);
    console.log(`Slot ${i}: ${slot}`);
  }

  // Try calling functions with try/catch
  const abi = [
    "function tut() view returns (address)",
    "function utut() view returns (address)",
    "function availableTutBalance() view returns (uint256)",
    "function totalTutToUtut() view returns (uint256)",
    "function totalUtutToTut() view returns (uint256)",
    "function CONVERSION_FACTOR() view returns (uint256)",
    "function paused() view returns (bool)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  ];

  const converter = new ethers.Contract(CONVERTER_ADDRESS, abi, signer);
  
  console.log("\n📋 Reading contract state...\n");

  try {
    const factor = await converter.CONVERSION_FACTOR();
    console.log(`✅ CONVERSION_FACTOR: ${factor}`);
  } catch (e) {
    console.log(`❌ CONVERSION_FACTOR: ${e.message}`);
  }

  try {
    const paused = await converter.paused();
    console.log(`✅ Paused: ${paused}`);
  } catch (e) {
    console.log(`❌ Paused: ${e.message}`);
  }

  try {
    const tut = await converter.tut();
    console.log(`✅ TUT address: ${tut}`);
  } catch (e) {
    console.log(`❌ TUT address: ${e.message}`);
  }

  try {
    const utut = await converter.utut();
    console.log(`✅ uTUT address: ${utut}`);
  } catch (e) {
    console.log(`❌ uTUT address: ${e.message}`);
  }

  try {
    const balance = await converter.availableTutBalance();
    console.log(`✅ Available TUT Balance: ${balance}`);
  } catch (e) {
    console.log(`❌ Available TUT Balance: ${e.message}`);
  }

  try {
    const adminRole = await converter.DEFAULT_ADMIN_ROLE();
    const isAdmin = await converter.hasRole(adminRole, signer.address);
    console.log(`✅ Is Admin: ${isAdmin}`);
  } catch (e) {
    console.log(`❌ Is Admin check: ${e.message}`);
  }

  // Get bytecode to verify contract is deployed
  const code = await provider.getCode(CONVERTER_ADDRESS);
  console.log(`\n📦 Contract bytecode length: ${code.length} chars`);
  console.log(`   Contract is ${code.length > 2 ? "DEPLOYED" : "NOT DEPLOYED"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
