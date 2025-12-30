const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("⚙️  Queue & Execute Proposal");
  console.log("━".repeat(60));
  console.log("Account:", signer.address);

  const proposalId = process.env.PROPOSAL_ID || 
    "41317180035706255402696261552167984124430422126996375608703917760682750104482";
  
  const action = process.env.ACTION || "status"; // status, queue, execute

  const governorAddress = process.env.GOVERNOR_ADDRESS || "0x4bfc55437d2006B0f3615dA96Dad41051006f32D";
  const timelockAddress = process.env.TIMELOCK_ADDRESS || "0x707b6e5513aB897CE30A8791b81Cb1eF4D2bE8d4";

  const Governor = await hre.ethers.getContractAt("TolaniEcosystemGovernor", governorAddress);
  const Timelock = await hre.ethers.getContractAt("TolaniEcosystemTimelock", timelockAddress);

  const stateLabels = [
    "Pending",      // 0
    "Active",       // 1
    "Canceled",     // 2
    "Defeated",     // 3
    "Succeeded",    // 4 - Can queue
    "Queued",       // 5 - Can execute after timelock
    "Expired",      // 6
    "Executed"      // 7
  ];

  const state = await Governor.state(proposalId);
  console.log("\n📋 Proposal Status");
  console.log("━".repeat(60));
  console.log("Proposal ID:", proposalId.toString().slice(0, 30) + "...");
  console.log("Current State:", stateLabels[state], `(${state})`);

  // Get vote counts
  const votes = await Governor.proposalVotes(proposalId);
  console.log("\n📊 Vote Results:");
  console.log("   For:", hre.ethers.formatEther(votes.forVotes));
  console.log("   Against:", hre.ethers.formatEther(votes.againstVotes));
  console.log("   Abstain:", hre.ethers.formatEther(votes.abstainVotes));

  if (action === "status") {
    console.log("\n📍 Next Steps:");
    switch (Number(state)) {
      case 0:
        console.log("   → Wait for voting to start");
        break;
      case 1:
        console.log("   → Voting is active - cast your vote!");
        console.log("   Run: PROPOSAL_ID=" + proposalId + " npx hardhat run scripts/vote-proposal.js --network sepolia");
        break;
      case 4:
        console.log("   → Proposal succeeded! Ready to queue.");
        console.log("   Run: ACTION=queue PROPOSAL_ID=" + proposalId + " npx hardhat run scripts/queue-and-execute.js --network sepolia");
        break;
      case 5:
        const eta = await Governor.proposalEta(proposalId);
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = Number(eta) - now;
        if (timeRemaining > 0) {
          console.log("   → Queued! Waiting for timelock...");
          console.log(`   Time remaining: ${(timeRemaining / 3600).toFixed(2)} hours`);
          console.log(`   Execute after: ${new Date(Number(eta) * 1000).toLocaleString()}`);
        } else {
          console.log("   → Timelock elapsed! Ready to execute.");
          console.log("   Run: ACTION=execute PROPOSAL_ID=" + proposalId + " npx hardhat run scripts/queue-and-execute.js --network sepolia");
        }
        break;
      case 7:
        console.log("   ✅ Proposal has been executed!");
        break;
      default:
        console.log("   Proposal is in terminal state:", stateLabels[state]);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUEUE PROPOSAL
  // ═══════════════════════════════════════════════════════════════
  if (action === "queue") {
    if (state !== 4n) {
      console.log("\n❌ Cannot queue - proposal must be in Succeeded state");
      console.log("   Current state:", stateLabels[state]);
      return;
    }

    console.log("\n📋 Queuing proposal...");

    // For our test proposal (no-op), we need to reconstruct the proposal parameters
    // This is the same as what was used in test-proposal.js
    const targets = [governorAddress];
    const values = [0];
    const calldatas = ["0x"]; // No-op
    const descriptionHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes(
        "TIP-001: Test Governance Proposal\n\n" +
        "## Summary\n" +
        "This is a test proposal to validate the Tolani Ecosystem DAO governance system.\n\n" +
        "## Motivation\n" +
        "Before deploying to mainnet, we need to ensure all governance mechanisms work correctly.\n\n" +
        "## Specification\n" +
        "This proposal performs no on-chain actions (no-op). It only tests:\n" +
        "- Proposal creation\n" +
        "- Voting mechanism\n" +
        "- Quorum requirements\n" +
        "- Timelock execution\n\n" +
        "## Vote\n" +
        "- FOR: Confirm governance is working\n" +
        "- AGAINST: Report issues with governance\n" +
        "- ABSTAIN: Acknowledge test without opinion"
      )
    );

    const tx = await Governor.queue(targets, values, calldatas, descriptionHash);
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Proposal queued successfully!");
    console.log("Block:", receipt.blockNumber);

    // Get timelock info
    const eta = await Governor.proposalEta(proposalId);
    console.log("\n⏰ Timelock Info:");
    console.log("   Execute after:", new Date(Number(eta) * 1000).toLocaleString());
    
    const timelockDelay = await Timelock.getMinDelay();
    console.log("   Timelock delay:", timelockDelay.toString(), "seconds");
  }

  // ═══════════════════════════════════════════════════════════════
  // EXECUTE PROPOSAL
  // ═══════════════════════════════════════════════════════════════
  if (action === "execute") {
    if (state !== 5n) {
      console.log("\n❌ Cannot execute - proposal must be in Queued state");
      console.log("   Current state:", stateLabels[state]);
      return;
    }

    // Check if timelock has elapsed
    const eta = await Governor.proposalEta(proposalId);
    const now = Math.floor(Date.now() / 1000);
    
    if (now < Number(eta)) {
      const timeRemaining = Number(eta) - now;
      console.log("\n⏳ Timelock not yet elapsed!");
      console.log("   Time remaining:", (timeRemaining / 3600).toFixed(2), "hours");
      console.log("   Execute after:", new Date(Number(eta) * 1000).toLocaleString());
      return;
    }

    console.log("\n🚀 Executing proposal...");

    const targets = [governorAddress];
    const values = [0];
    const calldatas = ["0x"];
    const descriptionHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes(
        "TIP-001: Test Governance Proposal\n\n" +
        "## Summary\n" +
        "This is a test proposal to validate the Tolani Ecosystem DAO governance system.\n\n" +
        "## Motivation\n" +
        "Before deploying to mainnet, we need to ensure all governance mechanisms work correctly.\n\n" +
        "## Specification\n" +
        "This proposal performs no on-chain actions (no-op). It only tests:\n" +
        "- Proposal creation\n" +
        "- Voting mechanism\n" +
        "- Quorum requirements\n" +
        "- Timelock execution\n\n" +
        "## Vote\n" +
        "- FOR: Confirm governance is working\n" +
        "- AGAINST: Report issues with governance\n" +
        "- ABSTAIN: Acknowledge test without opinion"
      )
    );

    const tx = await Governor.execute(targets, values, calldatas, descriptionHash);
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Proposal executed successfully!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    console.log("\n🎉 GOVERNANCE TEST COMPLETE!");
    console.log("━".repeat(60));
    console.log("The Tolani Ecosystem DAO governance system is fully functional.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
