const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to queue and execute a passed governance proposal
 * 
 * Usage:
 * GOVERNOR_ADDRESS=0x... PROPOSAL_ID=123... npx hardhat run scripts/execute.js --network <network>
 * 
 * This script will:
 * 1. Queue the proposal in the timelock (if not already queued)
 * 2. Wait for timelock delay (or skip if already passed)
 * 3. Execute the proposal
 */

async function main() {
  const [executor] = await ethers.getSigners();
  console.log("Executing with account:", executor.address);

  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

  if (!GOVERNOR_ADDRESS) {
    throw new Error("Set GOVERNOR_ADDRESS in your environment");
  }

  // Get Governor contract
  const governor = await ethers.getContractAt(
    [
      "function state(uint256 proposalId) view returns (uint8)",
      "function queue(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) returns (uint256)",
      "function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) returns (uint256)",
      "function proposalEta(uint256 proposalId) view returns (uint256)",
    ],
    GOVERNOR_ADDRESS
  );

  // Reconstruct proposal parameters (must match exactly what was proposed)
  // Example: Mint 1,000,000 TUT tokens to treasury
  const mintAmount = ethers.parseEther("1000000");
  const tutInterface = new ethers.Interface([
    "function mint(address to, uint256 amount)"
  ]);
  const mintCalldata = tutInterface.encodeFunctionData("mint", [TREASURY_ADDRESS, mintAmount]);

  const targets = [TUT_TOKEN_ADDRESS];
  const values = [0];
  const calldatas = [mintCalldata];
  const description = `# Mint 1,000,000 TUT to Treasury

## Summary
This proposal mints 1,000,000 TUT tokens to the DAO treasury for ecosystem development.

## Motivation
- Fund ecosystem grants
- Support development initiatives
- Provide liquidity for partnerships

## Specification
- **Action**: Mint 1,000,000 TUT tokens
- **Recipient**: Treasury (${TREASURY_ADDRESS})

## Voting
- For: Support minting tokens to treasury
- Against: Oppose the minting
- Abstain: No preference
`;

  const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

  // Check proposal state
  const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
  
  // Calculate proposal ID
  const proposalId = await governor.hashProposal
    ? await governor.hashProposal(targets, values, calldatas, descriptionHash)
    : process.env.PROPOSAL_ID;

  const state = await governor.state(proposalId);
  console.log("\nProposal ID:", proposalId.toString());
  console.log("Current state:", states[state]);

  // Queue if needed
  if (state === 4) { // Succeeded
    console.log("\nQueuing proposal in timelock...");
    const queueTx = await governor.queue(targets, values, calldatas, descriptionHash);
    await queueTx.wait();
    console.log("✓ Proposal queued");
  } else if (state === 5) { // Already Queued
    console.log("✓ Proposal already queued");
  } else if (state === 7) { // Executed
    console.log("✓ Proposal already executed");
    return;
  } else {
    throw new Error(`Proposal cannot be queued/executed (state: ${states[state]})`);
  }

  // Check ETA
  const eta = await governor.proposalEta(proposalId);
  const now = Math.floor(Date.now() / 1000);
  
  if (eta > now) {
    const waitTime = eta - now;
    console.log(`\n⏳ Timelock delay: ${waitTime} seconds remaining`);
    console.log(`   ETA: ${new Date(Number(eta) * 1000).toISOString()}`);
    console.log("   Re-run this script after the timelock delay has passed.");
    return;
  }

  // Execute
  console.log("\nExecuting proposal...");
  const executeTx = await governor.execute(targets, values, calldatas, descriptionHash);
  const receipt = await executeTx.wait();

  console.log("\n========== Proposal Executed ==========");
  console.log("Proposal ID:", proposalId.toString());
  console.log("Transaction:", receipt.hash);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
