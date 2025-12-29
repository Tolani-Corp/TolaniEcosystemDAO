const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to create a governance proposal
 * 
 * Usage:
 * GOVERNOR_ADDRESS=0x... npx hardhat run scripts/propose.js --network <network>
 * 
 * This example creates a proposal to mint TUT tokens to the treasury.
 * Modify the targets, values, calldatas, and description for your use case.
 */

async function main() {
  const [proposer] = await ethers.getSigners();
  console.log("Creating proposal with account:", proposer.address);

  const GOVERNOR_ADDRESS = process.env.GOVERNOR_ADDRESS;
  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

  if (!GOVERNOR_ADDRESS) {
    throw new Error("Set GOVERNOR_ADDRESS in your environment");
  }

  // Get Governor contract
  const governor = await ethers.getContractAt(
    [
      "function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) returns (uint256)",
      "function proposalThreshold() view returns (uint256)",
      "function hashProposal(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) view returns (uint256)",
    ],
    GOVERNOR_ADDRESS
  );

  // Check proposer has enough voting power
  const threshold = await governor.proposalThreshold();
  console.log("Proposal threshold:", ethers.formatEther(threshold), "TUT");

  // Example proposal: Mint 1,000,000 TUT tokens to treasury
  // Modify this section for your specific proposal
  const mintAmount = ethers.parseEther("1000000"); // 1M TUT
  
  // Encode the function call
  const tutInterface = new ethers.Interface([
    "function mint(address to, uint256 amount)"
  ]);
  const mintCalldata = tutInterface.encodeFunctionData("mint", [TREASURY_ADDRESS, mintAmount]);

  // Proposal parameters
  const targets = [TUT_TOKEN_ADDRESS];
  const values = [0]; // No ETH sent
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

  console.log("\n--- Proposal Details ---");
  console.log("Targets:", targets);
  console.log("Values:", values);
  console.log("Description:", description.substring(0, 100) + "...");

  // Create the proposal
  console.log("\nSubmitting proposal...");
  const tx = await governor.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();

  // Get proposal ID from events
  const proposalCreatedEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === "ProposalCreated"
  );
  
  const proposalId = proposalCreatedEvent ? proposalCreatedEvent.args[0] : "Check transaction logs";

  console.log("\n========== Proposal Created ==========");
  console.log("Proposal ID:", proposalId.toString());
  console.log("Transaction:", receipt.hash);
  console.log("=======================================");

  console.log("\n📋 Next Steps:");
  console.log("1. Wait for voting delay (1 day) to pass");
  console.log("2. Vote on the proposal using vote.js");
  console.log("3. After voting period (1 week), queue if passed");
  console.log("4. Execute after timelock delay (1 hour)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
