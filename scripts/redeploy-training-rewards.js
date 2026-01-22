/**
 * Redeploy TrainingRewardsSimple with correct configuration
 * 
 * This fixes the misconfigured deployment by creating a new TrainingRewards
 * with the correct uTUT token and Safe as admin.
 * 
 * Run: npx hardhat run scripts/redeploy-training-rewards.js --network base
 */

const hre = require("hardhat");
const ethers = hre.ethers;

// Existing verified contracts on Base mainnet
const UTUT_TOKEN = "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4";
const SESSION_KEY_REGISTRY = "0x73e8fDfE1EEd5f6fbE47Ef9bCEaD76da78516025";

// Admin - User's Gnosis Safe
const SAFE_ADDRESS = "0x57dd8B744fd527c4cbd983d2878a29c5116ab855";

// Relayer wallet (for REWARDER_ROLE)
const RELAYER_WALLET = "0x3203009FC71927c8484645B3dF17863d1eF3A21a";

// Campaign configurations
const CAMPAIGNS = [
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-general")),
    name: "IBM SkillsBuild - General Courses",
    rewardPerCompletion: 50,
    budget: 100000,
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-ai")),
    name: "IBM SkillsBuild - AI & Data Science",
    rewardPerCompletion: 100,
    budget: 50000,
  },
  {
    id: ethers.keccak256(ethers.toUtf8Bytes("ibm-skillsbuild-cybersecurity")),
    name: "IBM SkillsBuild - Cybersecurity",
    rewardPerCompletion: 75,
    budget: 50000,
  },
];

async function main() {
  console.log("🔄 Redeploying TrainingRewardsSimple");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Verify dependencies exist
  console.log("\n📋 Checking dependencies...");
  const ututCode = await ethers.provider.getCode(UTUT_TOKEN);
  const sessionCode = await ethers.provider.getCode(SESSION_KEY_REGISTRY);
  
  if (ututCode === "0x") {
    throw new Error("uTUT contract not found at " + UTUT_TOKEN);
  }
  console.log("✅ uTUT exists at", UTUT_TOKEN);
  
  if (sessionCode === "0x") {
    throw new Error("SessionKeyRegistry not found at " + SESSION_KEY_REGISTRY);
  }
  console.log("✅ SessionKeyRegistry exists at", SESSION_KEY_REGISTRY);

  // Deploy TrainingRewardsSimple
  console.log("\n🚀 Deploying TrainingRewardsSimple...");
  console.log("   Owner (Safe):", SAFE_ADDRESS);
  console.log("   uTUT Token:", UTUT_TOKEN);
  console.log("   Session Registry:", SESSION_KEY_REGISTRY);

  const TrainingRewards = await ethers.getContractFactory("TrainingRewardsSimple");
  const trainingRewards = await TrainingRewards.deploy(
    SAFE_ADDRESS,           // owner (gets DEFAULT_ADMIN_ROLE, CAMPAIGN_MANAGER_ROLE, REWARDER_ROLE)
    UTUT_TOKEN,             // uTUT token
    SESSION_KEY_REGISTRY    // session key registry
  );

  await trainingRewards.waitForDeployment();
  const trainingRewardsAddress = await trainingRewards.getAddress();
  console.log("✅ TrainingRewardsSimple deployed at:", trainingRewardsAddress);

  // Verify roles
  console.log("\n🔍 Verifying roles...");
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const REWARDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDER_ROLE"));
  const CAMPAIGN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CAMPAIGN_MANAGER_ROLE"));

  const safeIsAdmin = await trainingRewards.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  const safeIsRewarder = await trainingRewards.hasRole(REWARDER_ROLE, SAFE_ADDRESS);
  const safeIsManager = await trainingRewards.hasRole(CAMPAIGN_MANAGER_ROLE, SAFE_ADDRESS);

  console.log("   Safe has DEFAULT_ADMIN_ROLE:", safeIsAdmin);
  console.log("   Safe has REWARDER_ROLE:", safeIsRewarder);
  console.log("   Safe has CAMPAIGN_MANAGER_ROLE:", safeIsManager);

  // Grant MINTER_ROLE on uTUT to TrainingRewards (needed for minting rewards)
  console.log("\n📝 Next steps (via Gnosis Safe):");
  console.log("   1. Grant MINTER_ROLE on uTUT to TrainingRewards");
  console.log("      - Contract:", UTUT_TOKEN);
  console.log("      - Function: grantRole(bytes32 role, address account)");
  console.log("      - role:", ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")));
  console.log("      - account:", trainingRewardsAddress);
  
  console.log("\n   2. Grant REWARDER_ROLE to relayer wallet");
  console.log("      - Contract:", trainingRewardsAddress);
  console.log("      - Function: grantRole(bytes32 role, address account)");
  console.log("      - role:", REWARDER_ROLE);
  console.log("      - account:", RELAYER_WALLET);

  // Output deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(JSON.stringify({
    network: "base",
    chainId: 8453,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    safe: SAFE_ADDRESS,
    contracts: {
      TrainingRewardsSimple: trainingRewardsAddress,
      uTUT: UTUT_TOKEN,
      SessionKeyRegistry: SESSION_KEY_REGISTRY,
    },
    campaigns: CAMPAIGNS.map(c => ({
      id: c.id,
      name: c.name,
      rewardPerCompletion: c.rewardPerCompletion,
      budget: c.budget,
    })),
  }, null, 2));

  // Save to file
  const fs = require("fs");
  const deploymentData = {
    network: "base",
    chainId: 8453,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    safe: SAFE_ADDRESS,
    contracts: {
      TrainingRewardsSimple: trainingRewardsAddress,
    },
    roles: {
      REWARDER_ROLE,
      CAMPAIGN_MANAGER_ROLE,
      MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
    },
    relayer: RELAYER_WALLET,
  };
  
  fs.writeFileSync(
    `deployments/training-rewards-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\n💾 Deployment saved to deployments/training-rewards-*.json");

  // Verify on Basescan
  console.log("\n🔍 Verifying on Basescan...");
  try {
    await hre.run("verify:verify", {
      address: trainingRewardsAddress,
      constructorArguments: [SAFE_ADDRESS, UTUT_TOKEN, SESSION_KEY_REGISTRY],
    });
    console.log("✅ Contract verified on Basescan!");
  } catch (e) {
    if (e.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.log("⚠️ Verification failed:", e.message);
      console.log("   Run manually: npx hardhat verify --network base", trainingRewardsAddress, SAFE_ADDRESS, UTUT_TOKEN, SESSION_KEY_REGISTRY);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
