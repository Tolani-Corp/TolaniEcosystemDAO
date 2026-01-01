/**
 * Training Rewards Relayer Service
 * 
 * A simple relayer that processes IBM SkillsBuild training completions
 * and triggers on-chain rewards using the OPS wallet.
 * 
 * Features:
 * - Uses OPS wallet private key for transactions
 * - Processes training completion requests
 * - Opens sessions and grants rewards
 * - Tracks gas usage and reimburses from GasTreasury
 * 
 * Usage:
 *   node scripts/relayer/training-relayer.js
 * 
 * Environment:
 *   PRIVATE_KEY_OPS - OPS wallet private key
 *   BASE_SEPOLIA_RPC_URL - RPC endpoint
 */

const { ethers } = require("ethers");
require("dotenv").config();

// Configuration
const CONFIG = {
  network: {
    rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    chainId: 84532
  },
  contracts: {
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
    SessionKeyRegistry: "0xD360F7c69c18dA78461BE5364cBC56C14b584607",
    GasTreasuryModule: "0xC12035B044c5988E9977E50bA0913AEF4eec28F7",
    TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
    SessionInvoker: "0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867"
  },
  campaigns: {
    CONSTRUCTION: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V1")),
    AI_CLOUD: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V1")),
    ESG: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V1"))
  }
};

// Minimal ABIs
const SessionRegistryABI = [
  "function openSession(address sessionKey, uint8 tag, uint256 duration, uint256 maxActions) external",
  "function validateSession(address sessionKey, uint8 tag) external view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "event SessionOpened(address indexed sessionKey, address indexed owner, uint8 tag, uint256 expiry)"
];

const SessionInvokerABI = [
  "function invokeTrainingReward(address sessionKey, address learner, bytes32 campaignId, bytes32 completionProof) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "event TrainingRewardInvoked(address indexed sessionKey, address indexed learner, bytes32 indexed campaignId, bytes32 completionProof)"
];

const GasTreasuryABI = [
  "function getBalance() view returns (uint256)",
  "function reimburseGas(address relayer, uint256 amount, bytes32 txRef) external"
];

class TrainingRelayer {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.network.rpc);
    
    // Use OPS wallet
    const opsKey = process.env.PRIVATE_KEY_OPS;
    if (!opsKey) {
      throw new Error("PRIVATE_KEY_OPS not set in environment");
    }
    this.wallet = new ethers.Wallet(opsKey, this.provider);
    
    // Initialize contracts
    this.registry = new ethers.Contract(
      CONFIG.contracts.SessionKeyRegistry,
      SessionRegistryABI,
      this.wallet
    );
    this.invoker = new ethers.Contract(
      CONFIG.contracts.SessionInvoker,
      SessionInvokerABI,
      this.wallet
    );
    this.gasTreasury = new ethers.Contract(
      CONFIG.contracts.GasTreasuryModule,
      GasTreasuryABI,
      this.wallet
    );
    
    this.processedCompletions = new Set();
  }

  async initialize() {
    console.log("=".repeat(50));
    console.log("TRAINING RELAYER SERVICE");
    console.log("=".repeat(50));
    console.log(`Network: Base Sepolia (${CONFIG.network.chainId})`);
    console.log(`Relayer: ${this.wallet.address}`);
    
    const balance = await this.provider.getBalance(this.wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    
    const treasuryBalance = await this.gasTreasury.getBalance();
    console.log(`GasTreasury: ${ethers.formatEther(treasuryBalance)} ETH`);
    
    // Check roles
    const RELAYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE"));
    const hasRelayer = await this.invoker.hasRole(RELAYER_ROLE, this.wallet.address);
    console.log(`RELAYER_ROLE: ${hasRelayer ? "✅" : "❌"}`);
    
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    const hasOperator = await this.registry.hasRole(OPERATOR_ROLE, this.wallet.address);
    console.log(`OPERATOR_ROLE: ${hasOperator ? "✅" : "❌"}`);
    
    if (!hasRelayer || !hasOperator) {
      console.log("\n⚠️  Missing roles! Grant them using setup-wallet-roles.js");
    }
    
    console.log("=".repeat(50));
    return hasRelayer && hasOperator;
  }

  /**
   * Process a training completion from IBM SkillsBuild
   */
  async processTrainingCompletion(request) {
    const { learner, campaignId, completionId, ibmCredentialId } = request;
    
    // Generate unique completion proof
    const completionProof = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "bytes32", "string", "uint256"],
        [learner, campaignId, ibmCredentialId || completionId, Date.now()]
      )
    );
    
    // Check for duplicate
    if (this.processedCompletions.has(completionProof)) {
      console.log(`⏭️  Duplicate completion: ${completionId}`);
      return { success: false, reason: "duplicate" };
    }
    
    console.log(`\n📝 Processing completion for ${learner}`);
    console.log(`   Campaign: ${this.getCampaignName(campaignId)}`);
    
    try {
      // Step 1: Open session for learner
      console.log("   1. Opening session...");
      const sessionTx = await this.registry.openSession(
        learner,    // sessionKey
        0,          // TRAINING tag
        3600,       // 1 hour duration
        10          // max actions
      );
      await sessionTx.wait();
      console.log(`      ✅ Session: ${sessionTx.hash}`);
      
      // Step 2: Invoke reward
      console.log("   2. Invoking reward...");
      const rewardTx = await this.invoker.invokeTrainingReward(
        learner,
        learner,
        campaignId,
        completionProof
      );
      const receipt = await rewardTx.wait();
      console.log(`      ✅ Reward: ${rewardTx.hash}`);
      
      // Track completion
      this.processedCompletions.add(completionProof);
      
      // Calculate gas used
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
      const gasCost = gasUsed * gasPrice;
      
      console.log(`   💰 Gas used: ${ethers.formatEther(gasCost)} ETH`);
      
      return {
        success: true,
        sessionTx: sessionTx.hash,
        rewardTx: rewardTx.hash,
        gasCost: ethers.formatEther(gasCost)
      };
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.reason || error.message}`);
      return { success: false, reason: error.message };
    }
  }

  getCampaignName(campaignId) {
    for (const [name, id] of Object.entries(CONFIG.campaigns)) {
      if (id === campaignId) return name;
    }
    return "UNKNOWN";
  }

  /**
   * Process multiple completions in batch
   */
  async processBatch(completions) {
    const results = [];
    for (const completion of completions) {
      const result = await this.processTrainingCompletion(completion);
      results.push({ ...completion, ...result });
    }
    return results;
  }
}

// CLI interface
async function main() {
  const relayer = new TrainingRelayer();
  const ready = await relayer.initialize();
  
  if (!ready) {
    console.log("\n❌ Relayer not ready - missing roles");
    process.exit(1);
  }
  
  // Demo: Process a test completion
  console.log("\n🧪 Running test completion...");
  
  const testCompletion = {
    learner: "0x753b53809360bec8742a235D8B60375a57965099", // Test with admin wallet
    campaignId: CONFIG.campaigns.CONSTRUCTION,
    completionId: `TEST_${Date.now()}`,
    ibmCredentialId: "IBM-SKILLSBUILD-DEMO-001"
  };
  
  const result = await relayer.processTrainingCompletion(testCompletion);
  console.log("\n📊 Result:", result);
}

// Export for use as module
module.exports = { TrainingRelayer, CONFIG };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
