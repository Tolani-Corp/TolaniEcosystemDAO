const { ethers, upgrades } = require("hardhat");

/**
 * Deploy TUTTokenSmartV2 as a UUPS upgradeable proxy
 * 
 * This deploys the governance-enabled TUT token with:
 * - ERC20Votes for DAO governance
 * - Blacklist for compliance
 * - UUPS upgradeability
 * - ERC2771 meta-transactions
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TUTTokenSmartV2 with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Token parameters
  const INITIAL_SUPPLY = ethers.parseEther("50000000"); // 50 million TUT
  const MAX_CAP = ethers.parseEther("100000000"); // 100 million TUT max
  
  // Trusted forwarder - use deployer address or a real forwarder for gasless txs
  // For testing, we'll use a zero-capability forwarder (just use any address)
  const TRUSTED_FORWARDER = deployer.address; // Can be changed to a real forwarder later

  console.log("\nToken Parameters:");
  console.log("- Initial Supply:", ethers.formatEther(INITIAL_SUPPLY), "TUT");
  console.log("- Max Cap:", ethers.formatEther(MAX_CAP), "TUT");
  console.log("- Trusted Forwarder:", TRUSTED_FORWARDER);
  console.log("- Owner:", deployer.address);

  // Deploy implementation
  console.log("\n1. Deploying TUTTokenSmart implementation...");
  const TUTToken = await ethers.getContractFactory("TUTTokenSmart");
  
  // For UUPS, we need to deploy implementation first with forwarder in constructor
  const implementation = await TUTToken.deploy(TRUSTED_FORWARDER);
  await implementation.waitForDeployment();
  const implAddress = await implementation.getAddress();
  console.log("Implementation deployed to:", implAddress);

  // Deploy proxy and initialize
  console.log("\n2. Deploying UUPS Proxy and initializing...");
  
  // Encode initialization call
  const initData = TUTToken.interface.encodeFunctionData("initialize", [
    deployer.address,      // owner
    INITIAL_SUPPLY,        // initialSupply
    MAX_CAP,               // cap
    TRUSTED_FORWARDER      // forwarder (must match constructor)
  ]);

  // Deploy ERC1967 Proxy
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  console.log("Proxy deployed to:", proxyAddress);

  // Get token instance via proxy
  const token = TUTToken.attach(proxyAddress);

  // Verify deployment
  console.log("\n3. Verifying deployment...");
  console.log("- Name:", await token.name());
  console.log("- Symbol:", await token.symbol());
  console.log("- Decimals:", await token.decimals());
  console.log("- Total Supply:", ethers.formatEther(await token.totalSupply()), "TUT");
  console.log("- Cap:", ethers.formatEther(await token.cap()), "TUT");
  console.log("- Owner Balance:", ethers.formatEther(await token.balanceOf(deployer.address)), "TUT");

  // Check roles
  const MINTER_ROLE = await token.MINTER_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const UPGRADER_ROLE = await token.UPGRADER_ROLE();
  const BLACKLIST_ROLE = await token.BLACKLIST_ROLE();

  console.log("\n4. Role verification:");
  console.log("- Has MINTER_ROLE:", await token.hasRole(MINTER_ROLE, deployer.address));
  console.log("- Has PAUSER_ROLE:", await token.hasRole(PAUSER_ROLE, deployer.address));
  console.log("- Has UPGRADER_ROLE:", await token.hasRole(UPGRADER_ROLE, deployer.address));
  console.log("- Has BLACKLIST_ROLE:", await token.hasRole(BLACKLIST_ROLE, deployer.address));

  // Test governance functions
  console.log("\n5. Testing governance functions...");
  
  // Self-delegate to enable voting
  console.log("- Self-delegating to enable voting power...");
  const delegateTx = await token.delegate(deployer.address);
  await delegateTx.wait();
  
  const votes = await token.getVotes(deployer.address);
  console.log("- Voting power after delegation:", ethers.formatEther(votes), "TUT");

  console.log("\n========== Deployment Complete ==========");
  console.log("Implementation:", implAddress);
  console.log("Proxy (use this):", proxyAddress);
  console.log("==========================================");
  
  console.log("\nNext steps:");
  console.log("1. Verify on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${implAddress} "${TRUSTED_FORWARDER}"`);
  console.log("\n2. Set TUT_TOKEN_ADDRESS in .env:");
  console.log(`   TUT_TOKEN_ADDRESS=${proxyAddress}`);
  console.log("\n3. Grant MINTER_ROLE to Treasury/Timelock as needed");

  return {
    implementation: implAddress,
    proxy: proxyAddress,
    token: token
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
