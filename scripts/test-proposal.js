const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to create a test governance proposal
 * This creates a simple proposal to demonstrate the governance flow
 */

async function main() {
  const [proposer] = await ethers.getSigners();
  console.log("Creating proposal with account:", proposer.address);

  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

  if (!GOVERNOR_ADDRESS || !TREASURY_ADDRESS) {
    throw new Error("Set GOVERNOR_ADDRESS and TREASURY_ADDRESS in your environment");
  }

  // Get Governor contract
  const governorABI = [
    "function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) returns (uint256)",
    "function proposalThreshold() view returns (uint256)",
    "function state(uint256 proposalId) view returns (uint8)",
    "function votingDelay() view returns (uint256)",
    "function votingPeriod() view returns (uint256)",
    "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  ];

  const governor = await ethers.getContractAt(governorABI, GOVERNOR_ADDRESS);

  // Check proposer has enough voting power
  const threshold = await governor.proposalThreshold();
  console.log("Proposal threshold:", ethers.formatEther(threshold), "votes needed");

  const votingDelay = await governor.votingDelay();
  const votingPeriod = await governor.votingPeriod();
  console.log("Voting delay:", votingDelay.toString(), "blocks (~", (Number(votingDelay) * 12 / 3600).toFixed(1), "hours)");
  console.log("Voting period:", votingPeriod.toString(), "blocks (~", (Number(votingPeriod) * 12 / 86400).toFixed(1), "days)");

  // Simple test proposal - update a parameter or call a view function
  // This is a "no-op" proposal that does nothing but tests the governance flow
  const description = `# TIP-001: First Test Proposal

## Summary
This is the first test proposal for the Tolani Ecosystem DAO governance system.

## Purpose
- Verify the governance flow works correctly
- Test proposal creation, voting, and execution
- Demonstrate DAO functionality

## Details
This proposal executes a zero-value call to the treasury contract to verify
the governance system is functioning properly.

## Vote
- **For**: Support this test proposal
- **Against**: Oppose this test proposal  
- **Abstain**: No preference

---
*Proposed by: ${proposer.address}*
*Network: Sepolia Testnet*
`;

  // Proposal: Call the treasury with 0 value (no-op to test flow)
  const targets = [TREASURY_ADDRESS];
  const values = [0];
  const calldatas = ["0x"]; // Empty calldata

  console.log("\n📝 Proposal Details:");
  console.log("Target:", TREASURY_ADDRESS);
  console.log("Value: 0 ETH");
  console.log("Action: No-op (test governance flow)");

  // Create the proposal
  console.log("\n⏳ Submitting proposal...");
  const tx = await governor.propose(targets, values, calldatas, description);
  console.log("Transaction submitted:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

  // Parse events to get proposal ID
  const iface = new ethers.Interface(governorABI);
  let proposalId;
  
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "ProposalCreated") {
        proposalId = parsed.args[0];
        break;
      }
    } catch (e) {
      // Not our event, continue
    }
  }

  if (!proposalId) {
    // Calculate proposal ID manually
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    proposalId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "uint256[]", "bytes[]", "bytes32"],
        [targets, values, calldatas, descriptionHash]
      )
    );
  }

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║       🎉 PROPOSAL CREATED! 🎉          ║");
  console.log("╠════════════════════════════════════════╣");
  console.log("║ Proposal ID:                           ║");
  console.log(`║ ${proposalId.toString().slice(0, 40)}║`);
  console.log("╠════════════════════════════════════════╣");
  console.log("║ Transaction:                           ║");
  console.log(`║ ${receipt.hash.slice(0, 40)}║`);
  console.log("╚════════════════════════════════════════╝");

  // Save proposal ID for voting
  console.log("\n📋 Save this Proposal ID for voting:");
  console.log(proposalId.toString());

  console.log("\n📋 Next Steps:");
  console.log("1. Wait for voting delay (~24 hours on Sepolia)");
  console.log("2. Run: PROPOSAL_ID=" + proposalId.toString().slice(0, 20) + "... npx hardhat run scripts/vote.js --network sepolia");
  console.log("3. View on frontend: https://tolanidao.netlify.app/proposals");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
