const { ethers } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Your wallet:", deployer.address);
  console.log("");
  
  const GasTreasury = await ethers.getContractAt("GasTreasuryModuleSimple", "0xC12035B044c5988E9977E50bA0913AEF4eec28F7");
  
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const TREASURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TREASURER_ROLE"));
  const RELAYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE"));
  
  const hasAdmin = await GasTreasury.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasTreasurer = await GasTreasury.hasRole(TREASURER_ROLE, deployer.address);
  const hasRelayer = await GasTreasury.hasRole(RELAYER_ROLE, deployer.address);
  
  console.log("GasTreasuryModule (0xC12035B044c5988E9977E50bA0913AEF4eec28F7):");
  console.log("  DEFAULT_ADMIN_ROLE:", hasAdmin ? "YES - You control it" : "NO");
  console.log("  TREASURER_ROLE:", hasTreasurer ? "YES" : "NO");
  console.log("  RELAYER_ROLE:", hasRelayer ? "YES" : "NO");
}
main();
