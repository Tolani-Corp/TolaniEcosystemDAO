const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("🗳️  Voting with account:", signer.address);

  // Get proposal ID from environment or use the test proposal
  const proposalId = process.env.PROPOSAL_ID || 
    "41317180035706255402696261552167984124430422126996375608703917760682750104482";
  
  // Vote type: 0 = Against, 1 = For, 2 = Abstain
  const voteType = parseInt(process.env.VOTE_TYPE || "1"); // Default: For
  const voteLabels = ["Against", "For", "Abstain"];

  const governorAddress = process.env.GOVERNOR_ADDRESS || "0x4bfc55437d2006B0f3615dA96Dad41051006f32D";
  
  const Governor = await hre.ethers.getContractAt("TolaniEcosystemGovernor", governorAddress);

  console.log("\n📋 Proposal Details:");
  console.log("━".repeat(50));
  console.log("Proposal ID:", proposalId);
  console.log("Vote:", voteLabels[voteType]);

  // Check proposal state
  const state = await Governor.state(proposalId);
  const stateLabels = [
    "Pending",      // 0
    "Active",       // 1
    "Canceled",     // 2
    "Defeated",     // 3
    "Succeeded",    // 4
    "Queued",       // 5
    "Expired",      // 6
    "Executed"      // 7
  ];
  
  console.log("Current State:", stateLabels[state]);

  if (state !== 1n) {
    console.log("\n⚠️  Proposal is not in Active state!");
    console.log("   Current state:", stateLabels[state]);
    
    if (state === 0n) {
      const snapshot = await Governor.proposalSnapshot(proposalId);
      const currentBlock = await hre.ethers.provider.getBlockNumber();
      const blocksRemaining = Number(snapshot) - currentBlock;
      const hoursRemaining = (blocksRemaining * 12) / 3600; // ~12 sec per block
      
      console.log(`   Voting starts at block ${snapshot}`);
      console.log(`   Current block: ${currentBlock}`);
      console.log(`   Blocks remaining: ${blocksRemaining}`);
      console.log(`   Estimated time: ~${hoursRemaining.toFixed(1)} hours`);
    }
    return;
  }

  // Check if already voted
  const hasVoted = await Governor.hasVoted(proposalId, signer.address);
  if (hasVoted) {
    console.log("\n⚠️  You have already voted on this proposal!");
    return;
  }

  // Get voting power
  const snapshot = await Governor.proposalSnapshot(proposalId);
  const tokenAddress = process.env.TUT_TOKEN_ADDRESS || "0x6D07D1dC1750B9d939e1b503d7fa6Faa803e2eFb";
  const Token = await hre.ethers.getContractAt("MockGovernanceToken", tokenAddress);
  const votingPower = await Token.getPastVotes(signer.address, snapshot);
  
  console.log("Your Voting Power:", hre.ethers.formatEther(votingPower), "votes");

  if (votingPower === 0n) {
    console.log("\n⚠️  You have no voting power for this proposal!");
    console.log("   Make sure you delegated tokens before the proposal was created.");
    return;
  }

  // Cast vote
  console.log("\n🗳️  Casting vote...");
  const reason = process.env.VOTE_REASON || "Supporting the test proposal for governance validation";
  
  const tx = await Governor.castVoteWithReason(proposalId, voteType, reason);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Vote cast successfully!");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Get updated vote counts
  const votes = await Governor.proposalVotes(proposalId);
  console.log("\n📊 Current Vote Tally:");
  console.log("━".repeat(50));
  console.log("Against:", hre.ethers.formatEther(votes.againstVotes), "votes");
  console.log("For:", hre.ethers.formatEther(votes.forVotes), "votes");
  console.log("Abstain:", hre.ethers.formatEther(votes.abstainVotes), "votes");

  // Check quorum
  const quorum = await Governor.quorum(snapshot);
  const totalFor = votes.forVotes + votes.abstainVotes;
  console.log("\nQuorum Required:", hre.ethers.formatEther(quorum), "votes");
  console.log("Quorum Met:", totalFor >= quorum ? "✅ Yes" : "❌ No");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
