const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to check the status of a governance proposal
 * 
 * Usage:
 * GOVERNOR_ADDRESS=0x... PROPOSAL_ID=123... npx hardhat run scripts/proposal-status.js --network <network>
 */

async function main() {
  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
  const PROPOSAL_ID = process.env.PROPOSAL_ID;

  if (!GOVERNOR_ADDRESS || !PROPOSAL_ID) {
    throw new Error("Set GOVERNOR_ADDRESS and PROPOSAL_ID in your environment");
  }

  // Get Governor contract
  const governor = await ethers.getContractAt(
    [
      "function state(uint256 proposalId) view returns (uint8)",
      "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
      "function proposalDeadline(uint256 proposalId) view returns (uint256)",
      "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
      "function proposalEta(uint256 proposalId) view returns (uint256)",
      "function quorum(uint256 blockNumber) view returns (uint256)",
    ],
    GOVERNOR_ADDRESS
  );

  const states = [
    "Pending",    // 0: Voting hasn't started yet
    "Active",     // 1: Voting is in progress
    "Canceled",   // 2: Proposal was canceled
    "Defeated",   // 3: Quorum not reached or more against votes
    "Succeeded",  // 4: Passed, ready to queue
    "Queued",     // 5: In timelock queue
    "Expired",    // 6: Timelock expired before execution
    "Executed"    // 7: Successfully executed
  ];

  // Get proposal data
  const state = await governor.state(PROPOSAL_ID);
  const votes = await governor.proposalVotes(PROPOSAL_ID);
  const deadline = await governor.proposalDeadline(PROPOSAL_ID);
  const snapshot = await governor.proposalSnapshot(PROPOSAL_ID);

  console.log("\n========== Proposal Status ==========");
  console.log("Proposal ID:", PROPOSAL_ID);
  console.log("State:", states[state], `(${state})`);
  console.log("");
  console.log("--- Votes ---");
  console.log("For:", ethers.formatEther(votes.forVotes), "TUT");
  console.log("Against:", ethers.formatEther(votes.againstVotes), "TUT");
  console.log("Abstain:", ethers.formatEther(votes.abstainVotes), "TUT");
  console.log("Total:", ethers.formatEther(votes.forVotes + votes.againstVotes + votes.abstainVotes), "TUT");
  console.log("");
  console.log("--- Timeline ---");
  console.log("Snapshot Block:", snapshot.toString());
  console.log("Voting Deadline:", deadline.toString());

  // Show quorum requirement
  try {
    const quorumRequired = await governor.quorum(snapshot);
    console.log("Quorum Required:", ethers.formatEther(quorumRequired), "TUT");
    
    const totalVotes = votes.forVotes + votes.againstVotes + votes.abstainVotes;
    const quorumMet = totalVotes >= quorumRequired;
    console.log("Quorum Met:", quorumMet ? "✓ Yes" : "✗ No");
  } catch (e) {
    // Quorum function might not be available if proposal is too old
  }

  // Show ETA if queued
  if (state === 5) {
    const eta = await governor.proposalEta(PROPOSAL_ID);
    const now = Math.floor(Date.now() / 1000);
    console.log("");
    console.log("--- Timelock ---");
    console.log("ETA:", new Date(Number(eta) * 1000).toISOString());
    if (eta > now) {
      console.log("Ready in:", Math.ceil((Number(eta) - now) / 60), "minutes");
    } else {
      console.log("Status: Ready to execute!");
    }
  }

  console.log("======================================");

  // Show next action
  console.log("\n📋 Next Action:");
  switch (state) {
    case 0:
      console.log("   Wait for voting delay to pass, then vote.");
      break;
    case 1:
      console.log("   Cast your vote using: npx hardhat run scripts/vote.js");
      break;
    case 4:
      console.log("   Queue the proposal: npx hardhat run scripts/execute.js");
      break;
    case 5:
      console.log("   Execute after timelock: npx hardhat run scripts/execute.js");
      break;
    case 7:
      console.log("   ✓ Proposal has been executed!");
      break;
    default:
      console.log("   No action available for this state.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
