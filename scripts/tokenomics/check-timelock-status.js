/**
 * Check and Execute Timelock Operation for TokenAllocator
 * This will grant GOVERNANCE_ROLE to deployer for pool initialization
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
  Timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
  TokenAllocator: "0x2b3B2a6036099B144b0C5fB95a26b775785B3360",
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("TIMELOCK OPERATION STATUS CHECK");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  const timelock = await ethers.getContractAt("TimelockController", CONTRACTS.Timelock);
  const allocator = await ethers.getContractAt("TokenAllocator", CONTRACTS.TokenAllocator);

  // Check current roles
  const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const hasRole = await allocator.hasRole(GOVERNANCE_ROLE, deployer.address);
  
  console.log(`\n📋 Current Status:`);
  console.log(`   Deployer has GOVERNANCE_ROLE: ${hasRole}`);

  if (hasRole) {
    console.log(`\n✅ Deployer already has GOVERNANCE_ROLE!`);
    console.log(`   You can proceed with pool initialization.`);
    return;
  }

  // Check Timelock min delay
  const minDelay = await timelock.getMinDelay();
  console.log(`   Timelock Min Delay: ${minDelay} seconds (${Number(minDelay) / 60} minutes)`);

  // Build the operation parameters
  const grantRoleData = allocator.interface.encodeFunctionData("grantRole", [
    GOVERNANCE_ROLE,
    deployer.address
  ]);

  const operationId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes", "bytes32", "bytes32"],
      [CONTRACTS.TokenAllocator, 0, grantRoleData, ethers.ZeroHash, ethers.ZeroHash]
    )
  );

  console.log(`\n🔑 Operation ID: ${operationId.slice(0, 20)}...`);

  // Check if operation exists and its status
  const isOperation = await timelock.isOperation(operationId);
  const isPending = await timelock.isOperationPending(operationId);
  const isReady = await timelock.isOperationReady(operationId);
  const isDone = await timelock.isOperationDone(operationId);

  console.log(`\n📊 Operation Status:`);
  console.log(`   Is Operation: ${isOperation}`);
  console.log(`   Is Pending: ${isPending}`);
  console.log(`   Is Ready: ${isReady}`);
  console.log(`   Is Done: ${isDone}`);

  if (isDone) {
    console.log(`\n✅ Operation already executed!`);
    // Double check the role
    const finalCheck = await allocator.hasRole(GOVERNANCE_ROLE, deployer.address);
    console.log(`   Deployer has GOVERNANCE_ROLE: ${finalCheck}`);
    return;
  }

  if (isReady) {
    console.log(`\n🚀 Operation is READY! Executing...`);
    
    const tx = await timelock.execute(
      CONTRACTS.TokenAllocator,
      0,
      grantRoleData,
      ethers.ZeroHash,
      ethers.ZeroHash
    );
    
    const receipt = await tx.wait();
    console.log(`   ✅ Executed! Tx: ${receipt.hash}`);
    
    // Verify
    const verified = await allocator.hasRole(GOVERNANCE_ROLE, deployer.address);
    console.log(`   Deployer now has GOVERNANCE_ROLE: ${verified}`);
    return;
  }

  if (isPending) {
    const timestamp = await timelock.getTimestamp(operationId);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = timestamp - now;
    
    console.log(`\n⏳ Operation is PENDING`);
    console.log(`   Executable at: ${new Date(Number(timestamp) * 1000).toISOString()}`);
    console.log(`   Time remaining: ${Number(remaining)} seconds (${Math.ceil(Number(remaining) / 60)} minutes)`);
    return;
  }

  // Operation doesn't exist - need to schedule it
  console.log(`\n⚠️ Operation not found. Scheduling new operation...`);
  
  // Check if deployer has PROPOSER_ROLE
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const canPropose = await timelock.hasRole(PROPOSER_ROLE, deployer.address);
  
  if (!canPropose) {
    console.log(`   ❌ Deployer doesn't have PROPOSER_ROLE on Timelock`);
    console.log(`   Need to use Governor to schedule this operation`);
    return;
  }

  const tx = await timelock.schedule(
    CONTRACTS.TokenAllocator,
    0,
    grantRoleData,
    ethers.ZeroHash,
    ethers.ZeroHash,
    minDelay
  );
  
  const receipt = await tx.wait();
  console.log(`   ✅ Scheduled! Tx: ${receipt.hash}`);
  console.log(`   Wait ${Number(minDelay) / 60} minutes, then run this script again to execute.`);

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
