const hre = require("hardhat");
async function main() {
  // Check the SECOND deployment's TrainingRewards
  const addr = "0x05b5Cc6741220cAe3fFf39753B036EBe2a54F1b5";
  const DEFAULT_ADMIN = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const REWARDER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("REWARDER_ROLE"));
  
  console.log("Checking TrainingRewards at:", addr);
  
  const provider = hre.ethers.provider;
  const code = await provider.getCode(addr);
  console.log("Code exists:", code !== "0x");
  console.log("Code length:", code.length);
  
  // Try calling as generic interface
  const abi = [
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ututToken() view returns (address)",
    "function paused() view returns (bool)"
  ];
  
  const contract = new hre.ethers.Contract(addr, abi, provider);
  
  try {
    const utut = await contract.ututToken();
    console.log("uTUT token:", utut);
  } catch (e) {
    console.log("ututToken error - might be different contract type");
  }
  
  // Check admin on deployer from that file
  const deployer = "0x753b53809360bec8742a235D8B60375a57965099";
  try {
    const isAdmin = await contract.hasRole(DEFAULT_ADMIN, deployer);
    console.log("Deployer has admin:", isAdmin);
  } catch (e) {
    console.log("hasRole error:", e.message.substring(0, 80));
  }
}
main();
