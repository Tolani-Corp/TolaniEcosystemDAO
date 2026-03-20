const { ethers } = require("hardhat");
const {
  deployCanonicalTUT,
  saveDeploymentManifest,
  DEFAULT_TRUSTED_FORWARDER,
} = require("./lib/deploy-tut");

/**
 * Deploy the canonical TUT token as a UUPS-style ERC1967 proxy stack.
 *
 * This repo is the canonical home of the Tolani Utility Token:
 * - contracts/token/TUTToken.sol      -> stable deployment entrypoint
 * - contracts/TUTTokenSmartV2.sol     -> production implementation
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying canonical TUT token with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const trustedForwarder = process.env.TUT_TRUSTED_FORWARDER || DEFAULT_TRUSTED_FORWARDER;

  console.log("\nToken Parameters:");
  console.log("- Initial Supply:", ethers.formatEther(ethers.parseEther("50000000")), "TUT");
  console.log("- Max Cap:", ethers.formatEther(ethers.parseEther("100000000")), "TUT");
  console.log("- Trusted Forwarder:", trustedForwarder);
  console.log("- Owner:", deployer.address);

  console.log("\n1. Deploying canonical TUT implementation and proxy...");
  const deployment = await deployCanonicalTUT({
    owner: deployer.address,
    trustedForwarder,
  });

  const {
    token,
    implementationAddress,
    proxyAddress,
  } = deployment;

  console.log("Implementation deployed to:", implementationAddress);
  console.log("Proxy deployed to:", proxyAddress);

  console.log("\n2. Verifying deployment...");
  console.log("- Name:", await token.name());
  console.log("- Symbol:", await token.symbol());
  console.log("- Decimals:", await token.decimals());
  console.log("- Total Supply:", ethers.formatEther(await token.totalSupply()), "TUT");
  console.log("- Cap:", ethers.formatEther(await token.cap()), "TUT");
  console.log(
    "- Owner Balance:",
    ethers.formatEther(await token.balanceOf(deployer.address)),
    "TUT"
  );

  const MINTER_ROLE = await token.MINTER_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const UPGRADER_ROLE = await token.UPGRADER_ROLE();
  const BLACKLIST_ROLE = await token.BLACKLIST_ROLE();

  console.log("\n3. Role verification:");
  console.log("- Has MINTER_ROLE:", await token.hasRole(MINTER_ROLE, deployer.address));
  console.log("- Has PAUSER_ROLE:", await token.hasRole(PAUSER_ROLE, deployer.address));
  console.log("- Has UPGRADER_ROLE:", await token.hasRole(UPGRADER_ROLE, deployer.address));
  console.log("- Has BLACKLIST_ROLE:", await token.hasRole(BLACKLIST_ROLE, deployer.address));

  console.log("\n4. Enabling voting power via self-delegation...");
  const delegateTx = await token.delegate(deployer.address);
  await delegateTx.wait();
  const votes = await token.getVotes(deployer.address);
  console.log("- Voting power after delegation:", ethers.formatEther(votes), "TUT");

  const manifestPath = saveDeploymentManifest("tut-token", deployment);

  console.log("\n========== Deployment Complete ==========");
  console.log("Implementation:", implementationAddress);
  console.log("Proxy (use this):", proxyAddress);
  console.log("Manifest:", manifestPath);
  console.log("=========================================");

  console.log("\nNext steps:");
  console.log("1. Verify on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${implementationAddress} "${trustedForwarder}"`);
  console.log("\n2. Set TUT_TOKEN_ADDRESS in .env:");
  console.log(`   TUT_TOKEN_ADDRESS=${proxyAddress}`);
  console.log("\n3. Grant MINTER_ROLE / PAUSER_ROLE / UPGRADER_ROLE to the timelock or treasury as needed");

  return {
    implementation: implementationAddress,
    proxy: proxyAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
