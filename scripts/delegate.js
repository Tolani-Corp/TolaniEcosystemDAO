const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Script to delegate voting power
 * 
 * TUT token holders must delegate their voting power before they can vote.
 * You can delegate to yourself or to another address.
 * 
 * Usage:
 * TUT_TOKEN_ADDRESS=0x... npx hardhat run scripts/delegate.js --network <network>
 * 
 * To delegate to another address:
 * TUT_TOKEN_ADDRESS=0x... DELEGATE_TO=0x... npx hardhat run scripts/delegate.js --network <network>
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Delegating with account:", signer.address);

  const TUT_TOKEN_ADDRESS = process.env.TUT_TOKEN_ADDRESS;
  const DELEGATE_TO = process.env.DELEGATE_TO || signer.address;

  if (!TUT_TOKEN_ADDRESS) {
    throw new Error("Set TUT_TOKEN_ADDRESS in your environment");
  }

  // Get TUT token contract
  const tutToken = await ethers.getContractAt(
    [
      "function delegate(address delegatee)",
      "function delegates(address account) view returns (address)",
      "function getVotes(address account) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)",
    ],
    TUT_TOKEN_ADDRESS
  );

  // Check current state
  const balance = await tutToken.balanceOf(signer.address);
  const currentDelegate = await tutToken.delegates(signer.address);
  const currentVotes = await tutToken.getVotes(signer.address);

  console.log("\n--- Current State ---");
  console.log("TUT Balance:", ethers.formatEther(balance), "TUT");
  console.log("Current Delegate:", currentDelegate || "None");
  console.log("Current Votes:", ethers.formatEther(currentVotes), "TUT");

  if (currentDelegate.toLowerCase() === DELEGATE_TO.toLowerCase()) {
    console.log("\n✓ Already delegated to", DELEGATE_TO);
    return;
  }

  // Delegate voting power
  console.log("\nDelegating to:", DELEGATE_TO);
  const tx = await tutToken.delegate(DELEGATE_TO);
  await tx.wait();

  // Check new state
  const newVotes = await tutToken.getVotes(DELEGATE_TO);

  console.log("\n========== Delegation Complete ==========");
  console.log("Delegated to:", DELEGATE_TO);
  console.log("New voting power:", ethers.formatEther(newVotes), "TUT");
  console.log("=========================================");

  if (DELEGATE_TO === signer.address) {
    console.log("\n✅ You can now vote on proposals!");
  } else {
    console.log(`\n✅ ${DELEGATE_TO} can now vote with your tokens!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
