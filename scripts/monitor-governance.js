const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("📊 Governance Monitor");
  console.log("━".repeat(60));
  console.log("Monitoring as:", signer.address);

  const governorAddress = process.env.GOVERNOR_ADDRESS || "0x4bfc55437d2006B0f3615dA96Dad41051006f32D";
  const timelockAddress = process.env.TIMELOCK_ADDRESS || "0x707b6e5513aB897CE30A8791b81Cb1eF4D2bE8d4";
  const tokenAddress = process.env.TUT_TOKEN_ADDRESS || "0x6D07D1dC1750B9d939e1b503d7fa6Faa803e2eFb";
  const treasuryAddress = process.env.TREASURY_ADDRESS || "0xBA83421da27c435f5F8eB8E6f5cFFe555aF3d669";

  const Governor = await hre.ethers.getContractAt("TolaniEcosystemGovernor", governorAddress);
  const Token = await hre.ethers.getContractAt("MockGovernanceToken", tokenAddress);
  const Timelock = await hre.ethers.getContractAt("TolaniEcosystemTimelock", timelockAddress);

  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log("Current Block:", currentBlock);
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // GOVERNANCE PARAMETERS
  // ═══════════════════════════════════════════════════════════════
  console.log("⚙️  GOVERNANCE PARAMETERS");
  console.log("═".repeat(60));
  
  const votingDelay = await Governor.votingDelay();
  const votingPeriod = await Governor.votingPeriod();
  const proposalThreshold = await Governor.proposalThreshold();
  const quorum = await Governor.quorum(currentBlock - 1);
  const timelockDelay = await Timelock.getMinDelay();

  console.log("Voting Delay:", votingDelay.toString(), "blocks (~", (Number(votingDelay) * 12 / 3600).toFixed(1), "hours)");
  console.log("Voting Period:", votingPeriod.toString(), "blocks (~", (Number(votingPeriod) * 12 / 86400).toFixed(1), "days)");
  console.log("Proposal Threshold:", hre.ethers.formatEther(proposalThreshold), "tokens");
  console.log("Quorum Required:", hre.ethers.formatEther(quorum), "votes (4%)");
  console.log("Timelock Delay:", timelockDelay.toString(), "seconds (~", (Number(timelockDelay) / 3600).toFixed(1), "hours)");
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // TOKEN STATISTICS
  // ═══════════════════════════════════════════════════════════════
  console.log("🪙 TOKEN STATISTICS");
  console.log("═".repeat(60));

  const totalSupply = await Token.totalSupply();
  const yourBalance = await Token.balanceOf(signer.address);
  const yourVotes = await Token.getVotes(signer.address);
  const delegates = await Token.delegates(signer.address);

  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "mTUT");
  console.log("Your Balance:", hre.ethers.formatEther(yourBalance), "mTUT");
  console.log("Your Voting Power:", hre.ethers.formatEther(yourVotes), "votes");
  console.log("Delegated To:", delegates === signer.address ? "Self ✅" : delegates);
  console.log("% of Total Supply:", ((Number(yourVotes) / Number(totalSupply)) * 100).toFixed(2) + "%");
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // TREASURY STATUS
  // ═══════════════════════════════════════════════════════════════
  console.log("💰 TREASURY STATUS");
  console.log("═".repeat(60));

  const treasuryEthBalance = await hre.ethers.provider.getBalance(treasuryAddress);
  const treasuryTokenBalance = await Token.balanceOf(treasuryAddress);
  const timelockEthBalance = await hre.ethers.provider.getBalance(timelockAddress);

  console.log("Treasury Address:", treasuryAddress);
  console.log("Treasury ETH:", hre.ethers.formatEther(treasuryEthBalance), "ETH");
  console.log("Treasury Tokens:", hre.ethers.formatEther(treasuryTokenBalance), "mTUT");
  console.log("Timelock ETH:", hre.ethers.formatEther(timelockEthBalance), "ETH");
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // PROPOSAL STATUS
  // ═══════════════════════════════════════════════════════════════
  console.log("📜 ACTIVE PROPOSALS");
  console.log("═".repeat(60));

  // Get proposal events (limit to 10000 blocks to avoid RPC limits)
  const filter = Governor.filters.ProposalCreated();
  const fromBlock = Math.max(0, currentBlock - 10000);
  const events = await Governor.queryFilter(filter, fromBlock);

  const stateLabels = [
    "⏳ Pending",
    "🗳️  Active",
    "❌ Canceled",
    "👎 Defeated",
    "✅ Succeeded",
    "📋 Queued",
    "⌛ Expired",
    "🎉 Executed"
  ];

  if (events.length === 0) {
    console.log("No proposals found.");
  } else {
    for (const event of events) {
      const proposalId = event.args.proposalId;
      const state = await Governor.state(proposalId);
      const votes = await Governor.proposalVotes(proposalId);
      const snapshot = await Governor.proposalSnapshot(proposalId);
      const deadline = await Governor.proposalDeadline(proposalId);

      console.log("\n┌─────────────────────────────────────────────────────────");
      console.log("│ Proposal ID:", proposalId.toString().slice(0, 20) + "...");
      console.log("│ Description:", event.args.description.slice(0, 50) + "...");
      console.log("│ State:", stateLabels[state]);
      console.log("│ Proposer:", event.args.proposer);
      console.log("├─────────────────────────────────────────────────────────");
      console.log("│ 📊 Votes:");
      console.log("│    For:", hre.ethers.formatEther(votes.forVotes));
      console.log("│    Against:", hre.ethers.formatEther(votes.againstVotes));
      console.log("│    Abstain:", hre.ethers.formatEther(votes.abstainVotes));
      console.log("├─────────────────────────────────────────────────────────");
      
      // Timeline info
      if (state === 0n) { // Pending
        const blocksToVoting = Number(snapshot) - currentBlock;
        console.log("│ ⏰ Voting starts in:", blocksToVoting, "blocks (~" + (blocksToVoting * 12 / 3600).toFixed(1) + " hours)");
      } else if (state === 1n) { // Active
        const blocksRemaining = Number(deadline) - currentBlock;
        console.log("│ ⏰ Voting ends in:", blocksRemaining, "blocks (~" + (blocksRemaining * 12 / 86400).toFixed(1) + " days)");
        
        // Check if user voted
        const hasVoted = await Governor.hasVoted(proposalId, signer.address);
        console.log("│ 🗳️  Your Vote:", hasVoted ? "Cast ✅" : "Not yet ❌");
      }
      
      console.log("│ Snapshot Block:", snapshot.toString());
      console.log("│ Deadline Block:", deadline.toString());
      console.log("└─────────────────────────────────────────────────────────");
    }
  }

  console.log("\n");
  console.log("═".repeat(60));
  console.log("📍 CONTRACT ADDRESSES");
  console.log("═".repeat(60));
  console.log("Governor:", governorAddress);
  console.log("Timelock:", timelockAddress);
  console.log("Token:", tokenAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("");
  console.log("🔗 View on Etherscan:");
  console.log("   Governor:", `https://sepolia.etherscan.io/address/${governorAddress}`);
  console.log("   Proposals:", `https://sepolia.etherscan.io/address/${governorAddress}#events`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
