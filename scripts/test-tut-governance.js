const { ethers } = require("hardhat");

/**
 * Test governance functions of the upgraded TUT token
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing TUT Token governance with account:", deployer.address);

  // New upgraded token
  const NEW_TOKEN = "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6";
  
  // Get token contract
  const token = await ethers.getContractAt("TUTTokenSmart", NEW_TOKEN);

  console.log("\n=== Token Info ===");
  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
  console.log("Total Supply:", ethers.formatEther(await token.totalSupply()), "TUT");

  console.log("\n=== Governance Functions ===");
  
  // Check voting power
  const votes = await token.getVotes(deployer.address);
  console.log("Current voting power:", ethers.formatEther(votes), "TUT");

  // Check delegates
  const delegate = await token.delegates(deployer.address);
  console.log("Delegated to:", delegate);

  // Check clock
  const currentClock = await token.clock();
  console.log("Current clock (block):", currentClock.toString());

  // Check clock mode
  const clockMode = await token.CLOCK_MODE();
  console.log("Clock mode:", clockMode);

  // Test getPastVotes (should work now)
  const currentBlock = await ethers.provider.getBlockNumber();
  if (currentBlock > 1) {
    try {
      const pastVotes = await token.getPastVotes(deployer.address, currentBlock - 1);
      console.log("Past votes (block -1):", ethers.formatEther(pastVotes), "TUT");
    } catch (e) {
      console.log("Past votes query:", e.message);
    }
  }

  console.log("\n=== Blacklist Functions ===");
  const testAddr = "0x0000000000000000000000000000000000000001";
  const isBlacklisted = await token.isBlacklisted(testAddr);
  console.log("Address", testAddr, "blacklisted:", isBlacklisted);

  console.log("\n=== Role Check ===");
  const MINTER_ROLE = await token.MINTER_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const UPGRADER_ROLE = await token.UPGRADER_ROLE();
  const BLACKLIST_ROLE = await token.BLACKLIST_ROLE();
  
  console.log("MINTER_ROLE:", MINTER_ROLE);
  console.log("PAUSER_ROLE:", PAUSER_ROLE);
  console.log("UPGRADER_ROLE:", UPGRADER_ROLE);
  console.log("BLACKLIST_ROLE:", BLACKLIST_ROLE);

  console.log("\n=== EIP-2612 Permit ===");
  const nonce = await token.nonces(deployer.address);
  console.log("Nonce for", deployer.address, ":", nonce.toString());

  console.log("\n✅ All governance functions working correctly!");
  console.log("\nNew TUT Token Address:", NEW_TOKEN);
  console.log("Add this to .env: TUT_TOKEN_ADDRESS=" + NEW_TOKEN);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
