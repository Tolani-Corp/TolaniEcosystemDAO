const { ethers } = require("hardhat");

/**
 * Script to mint/transfer tokens and delegate voting power
 * This prepares accounts for governance participation
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up governance with account:", deployer.address);

  // Get contract addresses from environment
  const TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;

  if (!TOKEN_ADDRESS || !GOVERNOR_ADDRESS) {
    throw new Error("Set TUT_TOKEN_ADDRESS and GOVERNOR_ADDRESS in .env");
  }

  // Connect to contracts
  const token = await ethers.getContractAt("MockGovernanceToken", TOKEN_ADDRESS);
  const governor = await ethers.getContractAt("TolaniEcosystemGovernor", GOVERNOR_ADDRESS);

  console.log("\n📊 Token Info:");
  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
  
  const totalSupply = await token.totalSupply();
  console.log("Total Supply:", ethers.formatEther(totalSupply), "tokens");

  const balance = await token.balanceOf(deployer.address);
  console.log("Your Balance:", ethers.formatEther(balance), "tokens");

  // Check current voting power
  const votesBefore = await token.getVotes(deployer.address);
  console.log("\n🗳️  Current Voting Power:", ethers.formatEther(votesBefore), "votes");

  // Delegate to self if not already delegated
  if (votesBefore === 0n && balance > 0n) {
    console.log("\n⏳ Delegating voting power to self...");
    const tx = await token.delegate(deployer.address);
    await tx.wait();
    console.log("✅ Delegation complete!");

    const votesAfter = await token.getVotes(deployer.address);
    console.log("New Voting Power:", ethers.formatEther(votesAfter), "votes");
  }

  // Get governor info
  console.log("\n📋 Governor Info:");
  console.log("Governor Name:", await governor.name());
  console.log("Proposal Threshold:", ethers.formatEther(await governor.proposalThreshold()), "votes needed to propose");
  console.log("Voting Delay:", (await governor.votingDelay()).toString(), "blocks");
  console.log("Voting Period:", (await governor.votingPeriod()).toString(), "blocks");

  // Get current quorum
  const blockNumber = await ethers.provider.getBlockNumber();
  try {
    const quorum = await governor.quorum(blockNumber - 1);
    console.log("Quorum:", ethers.formatEther(quorum), "votes needed");
  } catch (e) {
    console.log("Quorum: (checking previous block failed, this is normal for new deployments)");
  }

  console.log("\n✅ Governance setup complete!");
  console.log("\nNext steps:");
  console.log("1. Run: npx hardhat run scripts/propose.js --network sepolia");
  console.log("2. Wait for voting delay");
  console.log("3. Run: npx hardhat run scripts/vote.js --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
