/**
 * Execute the scheduled grantRole operation
 * Run this after the timelock delay (1 hour)
 */

const { ethers } = require("hardhat");

async function main() {
  const allocatorAddress = "0x2b3B2a6036099B144b0C5fB95a26b775785B3360";
  const timelockAddress = "0x9d0ccD1371B3a1f570B353c46840C268Aac57872";
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const allocator = await ethers.getContractAt("TokenAllocator", allocatorAddress);
  const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", timelockAddress);
  
  const GOVERNANCE_ROLE = await allocator.GOVERNANCE_ROLE();
  
  // Recreate the exact same parameters used in schedule
  const data = allocator.interface.encodeFunctionData("grantRole", [
    GOVERNANCE_ROLE,
    signer.address
  ]);
  
  const predecessor = ethers.ZeroHash;
  
  // We need to find the salt - check pending operations or use a known salt
  // For now, let's try listing pending operations
  console.log("\n🔍 Looking for pending operations...");
  
  // Try common operation ID calculation
  // operationId = keccak256(abi.encode(target, value, data, predecessor, salt))
  
  // Let's check if signer already has GOVERNANCE_ROLE
  const hasGov = await allocator.hasRole(GOVERNANCE_ROLE, signer.address);
  console.log("Has GOVERNANCE_ROLE:", hasGov);
  
  if (hasGov) {
    console.log("✅ Already has GOVERNANCE_ROLE! Execute may have already happened.");
    return;
  }
  
  // Try with a salt we might have used
  // The salt was: ethers.keccak256(ethers.toUtf8Bytes("grant-governance-role-" + timestamp))
  // We don't know the exact timestamp, so let's try querying the timelock events
  
  console.log("\n📝 Checking recent CallScheduled events...");
  
  const filter = timelock.filters.CallScheduled();
  const events = await timelock.queryFilter(filter, -10000); // Last 10000 blocks
  
  console.log(`Found ${events.length} CallScheduled events`);
  
  for (const event of events.slice(-5)) {  // Last 5 events
    console.log("\nEvent:");
    console.log("  id:", event.args.id);
    console.log("  target:", event.args.target);
    console.log("  delay:", event.args.delay?.toString());
    
    if (event.args.target.toLowerCase() === allocatorAddress.toLowerCase()) {
      console.log("  ✅ This is our operation!");
      
      // Check if ready
      const isReady = await timelock.isOperationReady(event.args.id);
      const isPending = await timelock.isOperationPending(event.args.id);
      const isDone = await timelock.isOperationDone(event.args.id);
      
      console.log("  isReady:", isReady);
      console.log("  isPending:", isPending);
      console.log("  isDone:", isDone);
      
      if (isReady && !isDone) {
        console.log("\n🔄 Executing operation...");
        
        const tx = await timelock.execute(
          event.args.target,
          event.args.value,
          event.args.data,
          event.args.predecessor,
          event.args.salt
        );
        console.log("   Execute tx:", tx.hash);
        await tx.wait();
        console.log("   ✅ Operation executed!");
        
        // Verify
        const hasGovNow = await allocator.hasRole(GOVERNANCE_ROLE, signer.address);
        console.log("   Has GOVERNANCE_ROLE:", hasGovNow);
      } else if (!isReady) {
        // Get timestamp when ready
        const timestamp = await timelock.getTimestamp(event.args.id);
        const now = BigInt(Math.floor(Date.now() / 1000));
        const remaining = timestamp - now;
        console.log(`   ⏳ Not ready yet. Wait ${remaining} more seconds.`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
