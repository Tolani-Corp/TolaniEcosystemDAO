const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to vote on a governance proposal
 * 
 * Usage:
 * GOVERNOR_ADDRESS=0x... PROPOSAL_ID=123... npx hardhat run scripts/vote.js --network <network>
 * 
 * Vote options:
 * - 0 = Against
 * - 1 = For
 * - 2 = Abstain
 */

async function main() {
  const [voter] = await ethers.getSigners();
  console.log("Voting with account:", voter.address);

  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
  const PROPOSAL_ID = process.env.PROPOSAL_ID;
  const VOTE_SUPPORT = process.env.VOTE_SUPPORT || "1"; // Default: For

  if (!GOVERNOR_ADDRESS || !PROPOSAL_ID) {
    throw new Error("Set GOVERNOR_ADDRESS and PROPOSAL_ID in your environment");
  }

  const supportLabels = ["Against", "For", "Abstain"];
  const support = parseInt(VOTE_SUPPORT);

  console.log("\nProposal ID:", PROPOSAL_ID);
  console.log("Vote:", supportLabels[support]);

  // Get Governor contract
  const governor = await ethers.getContractAt(
    [
      "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
      "function castVoteWithReason(uint256 proposalId, uint8 support, string memory reason) returns (uint256)",
      "function state(uint256 proposalId) view returns (uint8)",
      "function hasVoted(uint256 proposalId, address account) view returns (bool)",
      "function getVotes(address account, uint256 timepoint) view returns (uint256)",
    ],
    GOVERNOR_ADDRESS
  );

  // Check proposal state
  const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
  const state = await governor.state(PROPOSAL_ID);
  console.log("Proposal state:", states[state]);

  if (state !== 1) {
    throw new Error(`Proposal is not active (state: ${states[state]}). Cannot vote.`);
  }

  // Check if already voted
  const hasVoted = await governor.hasVoted(PROPOSAL_ID, voter.address);
  if (hasVoted) {
    throw new Error("You have already voted on this proposal");
  }

  // Optional: Add a reason for your vote
  const reason = process.env.VOTE_REASON || "";

  // Cast vote
  console.log("\nCasting vote...");
  let tx;
  if (reason) {
    tx = await governor.castVoteWithReason(PROPOSAL_ID, support, reason);
  } else {
    tx = await governor.castVote(PROPOSAL_ID, support);
  }
  const receipt = await tx.wait();

  console.log("\n========== Vote Cast ==========");
  console.log("Proposal ID:", PROPOSAL_ID);
  console.log("Vote:", supportLabels[support]);
  console.log("Transaction:", receipt.hash);
  console.log("================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
