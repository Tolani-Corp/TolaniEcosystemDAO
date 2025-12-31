const { ethers } = require("hardhat");

/**
 * Test full governance flow with upgraded TUT token
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing governance flow with account:", deployer.address);

  // Contract addresses - NEW DEPLOYMENT
  const TOKEN_ADDRESS = "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6";
  const GOVERNOR_ADDRESS = "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f";
  const TIMELOCK_ADDRESS = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";
  const TREASURY_ADDRESS = "0xBB9d207ee665e9680458F2E451098f23D707Ad25";

  // Get contracts
  const token = await ethers.getContractAt("TUTTokenSmart", TOKEN_ADDRESS);
  const governor = await ethers.getContractAt("TolaniEcosystemGovernor", GOVERNOR_ADDRESS);

  console.log("\n=== Token Status ===");
  const balance = await token.balanceOf(deployer.address);
  console.log("Token Balance:", ethers.formatEther(balance), "TUT");
  
  const votes = await token.getVotes(deployer.address);
  console.log("Voting Power:", ethers.formatEther(votes), "TUT");

  const delegates = await token.delegates(deployer.address);
  console.log("Delegated to:", delegates);

  // Check if we need to delegate
  if (delegates === ethers.ZeroAddress) {
    console.log("\n⚠️  Not delegated yet. Self-delegating...");
    const tx = await token.delegate(deployer.address);
    await tx.wait();
    const newVotes = await token.getVotes(deployer.address);
    console.log("✅ Delegated! New voting power:", ethers.formatEther(newVotes), "TUT");
  }

  console.log("\n=== Governor Status ===");
  
  // Check proposal threshold
  const proposalThreshold = await governor.proposalThreshold();
  console.log("Proposal Threshold:", ethers.formatEther(proposalThreshold), "TUT");
  
  // Check quorum
  const currentBlock = await ethers.provider.getBlockNumber();
  try {
    const quorum = await governor.quorum(currentBlock - 1);
    console.log("Quorum Required:", ethers.formatEther(quorum), "TUT");
  } catch (e) {
    console.log("Quorum: (need more blocks for snapshot)");
  }

  // Check voting delay and period
  const votingDelay = await governor.votingDelay();
  const votingPeriod = await governor.votingPeriod();
  console.log("Voting Delay:", votingDelay.toString(), "blocks");
  console.log("Voting Period:", votingPeriod.toString(), "blocks");

  // Check if we can create a proposal
  const canPropose = votes >= proposalThreshold;
  console.log("\n=== Proposal Eligibility ===");
  console.log("Can create proposal:", canPropose ? "✅ YES" : "❌ NO (need more voting power)");

  if (canPropose) {
    console.log("\n=== Creating Test Proposal ===");
    
    // Create a simple signaling proposal (no actual execution)
    const targets = [TREASURY_ADDRESS];
    const values = [0];
    const calldatas = ["0x"]; // Empty calldata for signaling
    const description = `# Test Governance Proposal

This is a test proposal to verify the governance system works with the upgraded TUT token.

**Proposed by:** ${deployer.address}
**Token:** ${TOKEN_ADDRESS}
**Date:** ${new Date().toISOString()}

## Summary
Testing ERC20Votes integration with TolaniEcosystemGovernor.`;

    console.log("Creating proposal...");
    const proposeTx = await governor.propose(targets, values, calldatas, description);
    const receipt = await proposeTx.wait();
    
    // Get proposal ID from event
    const proposalCreatedEvent = receipt.logs.find(
      log => log.fragment?.name === "ProposalCreated"
    );
    
    if (proposalCreatedEvent) {
      const proposalId = proposalCreatedEvent.args[0];
      console.log("✅ Proposal created!");
      console.log("Proposal ID:", proposalId.toString());
      
      // Check proposal state
      const state = await governor.state(proposalId);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log("State:", states[state] || state);
    }
  }

  console.log("\n=== Summary ===");
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("Governor Address:", GOVERNOR_ADDRESS);
  console.log("Your Voting Power:", ethers.formatEther(votes), "TUT");
  console.log("Threshold:", ethers.formatEther(proposalThreshold), "TUT");
  console.log("Status:", canPropose ? "✅ Ready to govern!" : "❌ Need more voting power");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
