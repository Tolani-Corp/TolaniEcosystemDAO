/**
 * IBM SkillsBuild Webhook Server
 * 
 * Receives course completion webhooks from IBM SkillsBuild
 * and triggers on-chain training rewards
 * 
 * Endpoints:
 *   POST /webhook/skillsbuild - Receive completion notifications
 *   GET /health - Health check
 *   GET /status/:wallet - Check user reward status
 * 
 * Environment:
 *   PORT=3001
 *   RELAYER_PRIVATE_KEY - OPS wallet private key
 *   RPC_URL - Base Sepolia RPC
 *   WEBHOOK_SECRET - IBM webhook signature secret
 */

require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());

// ==========================================
// CONFIGURATION
// ==========================================

const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.IBM_WEBHOOK_SECRET || "dev-secret-change-me";

// Base Sepolia contracts
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  SessionKeyRegistry: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
  GasTreasuryModule: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
  TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
  SessionInvoker: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867"
};

// Course reward mappings (uTUT in micro-units, 6 decimals)
const COURSE_REWARDS = {
  // IBM SkillsBuild course IDs -> reward config
  "cybersecurity-fundamentals": { reward: 2000000, tag: "Cyber" },
  "ai-fundamentals": { reward: 3000000, tag: "AI" },
  "data-science-101": { reward: 2500000, tag: "Data" },
  "cloud-computing-basics": { reward: 2000000, tag: "Cloud" },
  "blockchain-essentials": { reward: 3500000, tag: "Blockchain" },
  "project-management": { reward: 2000000, tag: "PM" },
  "design-thinking": { reward: 1500000, tag: "Design" },
  "professional-skills": { reward: 1000000, tag: "Skills" },
  // Training category mappings
  "construction-safety": { reward: 2000000, tag: "Construction" },
  "ai-cloud-training": { reward: 4000000, tag: "AI Cloud" },
  "esg-fundamentals": { reward: 3000000, tag: "ESG" },
  // Default for unknown courses
  "default": { reward: 1000000, tag: "Training" }
};

// ABIs
const SESSION_INVOKER_ABI = [
  "function invokeTrainingReward(address sessionKey, string memory tag, uint256 reward, bytes32 courseHash) external",
  "function hasRole(bytes32 role, address account) view returns (bool)"
];

const SESSION_REGISTRY_ABI = [
  "function openSession(address sessionKey, string calldata tag, uint64 duration, uint16 maxActions) external",
  "function getSession(address sessionKey) view returns (tuple(address owner, string tag, uint64 expiresAt, uint16 actionsRemaining))"
];

const UTUT_ABI = [
  "function balanceOf(address account) view returns (uint256)"
];

// ==========================================
// PROVIDER & SIGNER SETUP
// ==========================================

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"
);

// Check for OPS private key - allow dev mode without it
const opsKey = process.env.OPS_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY;
let relayer = null;
let sessionInvoker = null;
let sessionRegistry = null;

if (opsKey && opsKey.length >= 64) {
  relayer = new ethers.Wallet(opsKey, provider);
  // Contract instances
  sessionInvoker = new ethers.Contract(CONTRACTS.SessionInvoker, SESSION_INVOKER_ABI, relayer);
  sessionRegistry = new ethers.Contract(CONTRACTS.SessionKeyRegistry, SESSION_REGISTRY_ABI, relayer);
} else {
  console.log("⚠️  No OPS_PRIVATE_KEY set - running in READ-ONLY mode");
  console.log("   Set OPS_PRIVATE_KEY in .env to enable reward processing");
}

const uTUT = new ethers.Contract(CONTRACTS.uTUT, UTUT_ABI, provider);

// ==========================================
// COMPLETION PROCESSING
// ==========================================

// In-memory store for processed completions (use Redis/DB in production)
const processedCompletions = new Map();

/**
 * Verify IBM webhook signature
 */
function verifySignature(payload, signature) {
  if (WEBHOOK_SECRET === "dev-secret-change-me") {
    console.log("⚠️  Using dev secret - signature validation disabled");
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature || ""),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

/**
 * Process a training completion
 */
async function processCompletion(data) {
  const { walletAddress, courseId, completionId, timestamp } = data;
  
  // Check if relayer is configured
  if (!relayer || !sessionInvoker || !sessionRegistry) {
    console.log(`\n⚠️  Cannot process - READ-ONLY mode (no OPS_PRIVATE_KEY)`);
    return { status: "error", message: "Server in read-only mode - set OPS_PRIVATE_KEY" };
  }
  
  // Check if already processed
  const completionKey = `${walletAddress}-${courseId}-${completionId}`;
  if (processedCompletions.has(completionKey)) {
    return { status: "duplicate", message: "Completion already processed" };
  }
  
  // Get course reward config
  const courseConfig = COURSE_REWARDS[courseId] || COURSE_REWARDS["default"];
  const { reward, tag } = courseConfig;
  
  console.log(`\n📚 Processing completion:`);
  console.log(`   Student: ${walletAddress}`);
  console.log(`   Course: ${courseId} (${tag})`);
  console.log(`   Reward: ${reward / 1_000_000} uTUT`);
  
  try {
    // Step 1: Open session for the student
    console.log(`\n1️⃣  Opening session for student...`);
    const duration = 300; // 5 minutes
    const maxActions = 1;
    
    const openTx = await sessionRegistry.openSession(
      walletAddress,
      tag,
      duration,
      maxActions
    );
    await openTx.wait(1);
    console.log(`   ✅ Session opened: ${openTx.hash.slice(0, 16)}...`);
    
    // Step 2: Invoke training reward
    console.log(`\n2️⃣  Invoking training reward...`);
    const courseHash = ethers.keccak256(ethers.toUtf8Bytes(`${courseId}-${completionId}`));
    
    const rewardTx = await sessionInvoker.invokeTrainingReward(
      walletAddress,
      tag,
      reward,
      courseHash
    );
    await rewardTx.wait(1);
    console.log(`   ✅ Reward sent: ${rewardTx.hash.slice(0, 16)}...`);
    
    // Check new balance
    const balance = await uTUT.balanceOf(walletAddress);
    console.log(`   💰 Student balance: ${Number(balance) / 1_000_000} uTUT`);
    
    // Mark as processed
    processedCompletions.set(completionKey, {
      txHash: rewardTx.hash,
      reward,
      tag,
      timestamp: Date.now()
    });
    
    return {
      status: "success",
      txHash: rewardTx.hash,
      reward,
      tag,
      newBalance: Number(balance) / 1_000_000
    };
    
  } catch (error) {
    console.error(`\n❌ Error processing completion:`, error.message);
    return {
      status: "error",
      message: error.message
    };
  }
}

// ==========================================
// ROUTES
// ==========================================

/**
 * Health check
 */
app.get("/health", async (req, res) => {
  let balance = "0";
  let relayerAddr = "Not configured";
  
  if (relayer) {
    const relayerBalance = await provider.getBalance(relayer.address);
    balance = ethers.formatEther(relayerBalance);
    relayerAddr = relayer.address;
  }
  
  res.json({
    status: relayer ? "healthy" : "read-only",
    relayer: relayerAddr,
    balance,
    contracts: CONTRACTS,
    processedCount: processedCompletions.size
  });
});

/**
 * IBM SkillsBuild webhook endpoint
 */
app.post("/webhook/skillsbuild", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("📩 Incoming webhook from IBM SkillsBuild");
  console.log("=".repeat(50));
  
  // Verify signature
  const signature = req.headers["x-hub-signature-256"] || req.headers["x-ibm-signature"];
  if (!verifySignature(req.body, signature)) {
    console.log("❌ Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  // Parse completion data
  const { event, data } = req.body;
  
  if (event !== "course.completed") {
    console.log(`ℹ️  Ignoring event: ${event}`);
    return res.json({ status: "ignored", event });
  }
  
  // Required fields
  const { wallet_address, course_id, completion_id, timestamp } = data;
  
  if (!wallet_address || !ethers.isAddress(wallet_address)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  
  // Process completion
  const result = await processCompletion({
    walletAddress: wallet_address,
    courseId: course_id,
    completionId: completion_id || Date.now().toString(),
    timestamp
  });
  
  res.json(result);
});

/**
 * Manual completion endpoint (for testing)
 */
app.post("/webhook/test", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("🧪 Test completion webhook");
  console.log("=".repeat(50));
  
  const { walletAddress, courseId } = req.body;
  
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  
  const result = await processCompletion({
    walletAddress,
    courseId: courseId || "ai-fundamentals",
    completionId: `test-${Date.now()}`,
    timestamp: new Date().toISOString()
  });
  
  res.json(result);
});

/**
 * Check user reward status
 */
app.get("/status/:wallet", async (req, res) => {
  const { wallet } = req.params;
  
  if (!ethers.isAddress(wallet)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  
  try {
    const balance = await uTUT.balanceOf(wallet);
    
    // Get user's processed completions
    const userCompletions = [];
    for (const [key, value] of processedCompletions) {
      if (key.startsWith(wallet.toLowerCase())) {
        userCompletions.push({ key, ...value });
      }
    }
    
    res.json({
      wallet,
      uTUTBalance: Number(balance) / 1_000_000,
      completions: userCompletions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List supported courses
 */
app.get("/courses", (req, res) => {
  const courses = Object.entries(COURSE_REWARDS)
    .filter(([id]) => id !== "default")
    .map(([id, config]) => ({
      courseId: id,
      reward: config.reward / 1_000_000,
      tag: config.tag
    }));
  
  res.json({ courses });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🎓 IBM SKILLSBUILD WEBHOOK SERVER");
  console.log("=".repeat(60));
  console.log(`\n📡 Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📚 Courses: http://localhost:${PORT}/courses`);
  if (relayer) {
    console.log(`\n👛 Relayer: ${relayer.address}`);
    console.log(`   Mode: ACTIVE (can process rewards)`);
  } else {
    console.log(`\n👛 Relayer: NOT CONFIGURED`);
    console.log(`   Mode: READ-ONLY (set OPS_PRIVATE_KEY to enable)`);
  }
  console.log(`\n📋 Contracts:`);
  Object.entries(CONTRACTS).forEach(([name, addr]) => {
    console.log(`   ${name}: ${addr}`);
  });
  console.log("\n⏳ Waiting for webhooks...\n");
});

module.exports = { app, processCompletion };
