/**
 * Grant GOVERNANCE_ROLE via Timelock
 * Since Timelock has admin over TokenAllocator
 */

const { ethers } = require("hardhat");

async function main() {
  const allocatorAddress = "0x2b3B2a6036099B144b0C5fB95a26b775785B3360";
  const timelockAddress = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Get contracts
  const allocator = await ethers.getContractAt("TokenAllocator", allocatorAddress);
  const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", timelockAddress);
  
  // Check Timelock roles
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
  
  const isProposer = await timelock.hasRole(PROPOSER_ROLE, signer.address);
  const isExecutor = await timelock.hasRole(EXECUTOR_ROLE, signer.address);
  const isAdmin = await timelock.hasRole(ADMIN_ROLE, signer.address);
  
  console.log("\nTimelock roles for signer:");
  console.log("  PROPOSER_ROLE:", isProposer);
  console.log("  EXECUTOR_ROLE:", isExecutor);
  console.log("  ADMIN_ROLE:", isAdmin);
  
  // Get min delay
  const minDelay = await timelock.getMinDelay();
  console.log("  Min delay:", minDelay.toString(), "seconds");
  
  if (!isProposer) {
    console.log("\n⚠️  Signer is not a proposer on Timelock.");
    
    // Check if Governor is the proposer
    const governorAddress = "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f";
    const governorIsProposer = await timelock.hasRole(PROPOSER_ROLE, governorAddress);
    console.log("  Governor is proposer:", governorIsProposer);
    
    // Since we have ADMIN_ROLE, grant ourselves PROPOSER and EXECUTOR
    if (isAdmin) {
      console.log("\n🔄 We have ADMIN_ROLE - granting PROPOSER_ROLE and EXECUTOR_ROLE...");
      
      let tx = await timelock.grantRole(PROPOSER_ROLE, signer.address);
      console.log("   Granting PROPOSER_ROLE tx:", tx.hash);
      await tx.wait();
      console.log("   ✅ PROPOSER_ROLE granted!");
      
      tx = await timelock.grantRole(EXECUTOR_ROLE, signer.address);
      console.log("   Granting EXECUTOR_ROLE tx:", tx.hash);
      await tx.wait();
      console.log("   ✅ EXECUTOR_ROLE granted!");
    } else {
      console.log("\n📝 Need to create governance proposal to grant GOVERNANCE_ROLE.");
      console.log("   This requires TUT tokens and going through the voting process.");
      return;
    }
  }
  
  // If we can propose, let's do it
  console.log("\n🔄 Scheduling grantRole operation via Timelock...");
  
  const GOVERNANCE_ROLE = await allocator.GOVERNANCE_ROLE();
  
  // Encode the grantRole call
  const data = allocator.interface.encodeFunctionData("grantRole", [
    GOVERNANCE_ROLE,
    signer.address
  ]);
  
  const predecessor = ethers.ZeroHash;
  const salt = ethers.keccak256(ethers.toUtf8Bytes("grant-governance-role-" + Date.now()));
  
  // Schedule the operation
  const scheduleTx = await timelock.schedule(
    allocatorAddress,  // target
    0,                 // value
    data,              // data
    predecessor,       // predecessor
    salt,              // salt
    minDelay           // delay
  );
  
  console.log("   Schedule tx:", scheduleTx.hash);
  await scheduleTx.wait();
  console.log("   ✅ Operation scheduled!");
  
  // If min delay is 0, we can execute immediately
  if (minDelay === 0n) {
    console.log("\n🔄 Executing immediately (minDelay=0)...");
    const executeTx = await timelock.execute(
      allocatorAddress,
      0,
      data,
      predecessor,
      salt
    );
    console.log("   Execute tx:", executeTx.hash);
    await executeTx.wait();
    console.log("   ✅ GOVERNANCE_ROLE granted!");
  } else {
    console.log(`\n⏳ Wait ${minDelay} seconds, then run execute.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
