/**
 * TolaniDAO Payment Relayer Service
 * 
 * Handles gasless meta-transactions for uTUT/TUT payments
 * Members sign EIP-712 messages, relayer submits on-chain
 * 
 * Usage:
 *   node scripts/relayer/payment-relayer.js
 * 
 * Environment:
 *   RELAYER_PRIVATE_KEY - Private key for relayer wallet
 *   BASE_SEPOLIA_RPC_URL - RPC endpoint
 *   PAYMENT_PROCESSOR - Contract address
 *   PORT - Server port (default: 3001)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const rateLimit = require("express-rate-limit");

// ============================================================
// CONFIGURATION
// ============================================================
const PORT = process.env.RELAYER_PORT || 3001;
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const PAYMENT_PROCESSOR = process.env.PAYMENT_PROCESSOR || "0x43c1B7C2D9d362369851D3a0996e4222ca9b7ef2";
const MERCHANT_REGISTRY = process.env.MERCHANT_REGISTRY || "0x17904f65220771fDBAbca6eCcDdAf42345C9571d";

// Relayer wallet - needs ETH for gas
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

// uTUT token address
const UTUT_ADDRESS = "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";

// ABIs
const PAYMENT_PROCESSOR_ABI = [
  "function payWithSignature(address payer, bytes32 merchantId, uint256 amount, bool useUTUT, uint256 nonce, uint256 deadline, bytes calldata signature) external returns (bytes32 paymentId)",
  "function nonces(address) view returns (uint256)",
  "function dailyGaslessUsed(address) view returns (uint256)",
  "function DAILY_GASLESS_LIMIT() view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "event PaymentProcessed(bytes32 indexed paymentId, address indexed payer, bytes32 indexed merchantId, uint256 amount, bool useUTUT, uint256 fee, uint256 timestamp)"
];

const MERCHANT_REGISTRY_ABI = [
  "function merchants(bytes32) view returns (string name, string businessId, uint8 category, address payoutAddress, address owner, uint256 feeRate, bool acceptsUTUT, bool acceptsTUT, uint8 status, uint256 totalVolume, uint256 totalTransactions, uint256 registeredAt, uint256 lastTransactionAt, string metadataURI)",
  "function getMerchant(bytes32) view returns (tuple(string name, string businessId, uint8 category, address payoutAddress, address owner, uint256 feeRate, bool acceptsUTUT, bool acceptsTUT, uint8 status, uint256 totalVolume, uint256 totalTransactions, uint256 registeredAt, uint256 lastTransactionAt, string metadataURI))",
  "function isActiveMerchant(bytes32) view returns (bool)"
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

// ============================================================
// SETUP
// ============================================================
const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" }
});
app.use(limiter);

// Provider and wallet
const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
const relayerWallet = new ethers.Wallet(RELAYER_KEY, provider);

// Contracts
const paymentProcessor = new ethers.Contract(PAYMENT_PROCESSOR, PAYMENT_PROCESSOR_ABI, relayerWallet);
const merchantRegistry = new ethers.Contract(MERCHANT_REGISTRY, MERCHANT_REGISTRY_ABI, provider);
const uTUT = new ethers.Contract(UTUT_ADDRESS, ERC20_ABI, provider);

console.log("🔄 Payment Relayer Service");
console.log(`   Relayer Address: ${relayerWallet.address}`);
console.log(`   Payment Processor: ${PAYMENT_PROCESSOR}`);
console.log(`   Network: Base Sepolia (84532)`);

// ============================================================
// EIP-712 TYPES (must match contract)
// ============================================================
const PAYMENT_TYPES = {
  GaslessPayment: [
    { name: "payer", type: "address" },
    { name: "merchantId", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "useUTUT", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

// ============================================================
// HEALTH CHECK ENDPOINT
// ============================================================
app.get("/health", async (req, res) => {
  try {
    const balance = await provider.getBalance(relayerWallet.address);
    const blockNumber = await provider.getBlockNumber();
    
    res.json({
      status: "ok",
      relayer: relayerWallet.address,
      balance: ethers.formatEther(balance),
      network: "baseSepolia",
      chainId: 84532,
      blockNumber,
      contracts: {
        paymentProcessor: PAYMENT_PROCESSOR,
        merchantRegistry: MERCHANT_REGISTRY
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ============================================================
// GET NONCE FOR PAYER
// ============================================================
app.get("/nonce/:address", async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    
    const nonce = await paymentProcessor.nonces(address);
    const dailyUsed = await paymentProcessor.dailyGaslessUsed(address);
    const dailyLimit = await paymentProcessor.DAILY_GASLESS_LIMIT();
    
    res.json({
      address,
      nonce: nonce.toString(),
      dailyUsed: ethers.formatEther(dailyUsed),
      dailyLimit: ethers.formatEther(dailyLimit),
      remainingLimit: ethers.formatEther(dailyLimit - dailyUsed)
    });
  } catch (error) {
    console.error("Error getting nonce:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET MERCHANT INFO
// ============================================================
app.get("/merchant/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // Validate bytes32 format
    if (!merchantId.startsWith("0x") || merchantId.length !== 66) {
      return res.status(400).json({ error: "Invalid merchantId format" });
    }
    
    const isActive = await merchantRegistry.isActiveMerchant(merchantId);
    if (!isActive) {
      return res.status(404).json({ error: "Merchant not found or inactive" });
    }
    
    const merchant = await merchantRegistry.getMerchant(merchantId);
    
    res.json({
      merchantId,
      name: merchant.name,
      businessId: merchant.businessId,
      category: merchant.category,
      payoutAddress: merchant.payoutAddress,
      feeRate: (Number(merchant.feeRate) / 100).toFixed(2) + "%",
      acceptsUTUT: merchant.acceptsUTUT,
      acceptsTUT: merchant.acceptsTUT,
      totalVolume: ethers.formatEther(merchant.totalVolume),
      totalTransactions: merchant.totalTransactions.toString()
    });
  } catch (error) {
    console.error("Error getting merchant:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PREPARE PAYMENT (for frontend to sign)
// ============================================================
app.post("/prepare", async (req, res) => {
  try {
    const { payer, merchantId, amount, useUTUT = true } = req.body;
    
    // Validations
    if (!ethers.isAddress(payer)) {
      return res.status(400).json({ error: "Invalid payer address" });
    }
    
    if (!merchantId || merchantId.length !== 66) {
      return res.status(400).json({ error: "Invalid merchantId" });
    }
    
    const amountWei = ethers.parseEther(amount.toString());
    if (amountWei <= 0n) {
      return res.status(400).json({ error: "Amount must be positive" });
    }
    
    // Check merchant is active
    const isActive = await merchantRegistry.isActiveMerchant(merchantId);
    if (!isActive) {
      return res.status(400).json({ error: "Merchant not found or inactive" });
    }
    
    // Check daily limit
    const dailyUsed = await paymentProcessor.dailyGaslessUsed(payer);
    const dailyLimit = await paymentProcessor.DAILY_GASLESS_LIMIT();
    if (dailyUsed + amountWei > dailyLimit) {
      return res.status(400).json({ 
        error: "Daily gasless limit exceeded",
        dailyUsed: ethers.formatEther(dailyUsed),
        dailyLimit: ethers.formatEther(dailyLimit),
        remaining: ethers.formatEther(dailyLimit - dailyUsed)
      });
    }
    
    // Check token balance and allowance
    const token = useUTUT ? uTUT : new ethers.Contract(
      "0x05AbCD77f178cF43E561091f263Eaa66353Dce87", // Mock TUT
      ERC20_ABI,
      provider
    );
    
    const balance = await token.balanceOf(payer);
    if (balance < amountWei) {
      return res.status(400).json({ 
        error: "Insufficient token balance",
        balance: ethers.formatEther(balance),
        required: amount
      });
    }
    
    const allowance = await token.allowance(payer, PAYMENT_PROCESSOR);
    if (allowance < amountWei) {
      return res.status(400).json({ 
        error: "Insufficient allowance - approve PaymentProcessor first",
        allowance: ethers.formatEther(allowance),
        required: amount,
        spender: PAYMENT_PROCESSOR
      });
    }
    
    // Get nonce and deadline
    const nonce = await paymentProcessor.nonces(payer);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // Get domain separator
    const domainSeparator = await paymentProcessor.DOMAIN_SEPARATOR();
    
    // Build EIP-712 message
    const domain = {
      name: "TolaniPaymentProcessor",
      version: "1",
      chainId: 84532,
      verifyingContract: PAYMENT_PROCESSOR
    };
    
    const message = {
      payer,
      merchantId,
      amount: amountWei.toString(),
      useUTUT,
      nonce: nonce.toString(),
      deadline
    };
    
    res.json({
      domain,
      types: PAYMENT_TYPES,
      primaryType: "GaslessPayment",
      message,
      // Simplified for frontend
      signData: {
        payer,
        merchantId,
        amount: amountWei.toString(),
        useUTUT,
        nonce: nonce.toString(),
        deadline: deadline.toString()
      }
    });
  } catch (error) {
    console.error("Error preparing payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// RELAY SIGNED PAYMENT
// ============================================================
app.post("/relay", async (req, res) => {
  try {
    const { payer, merchantId, amount, useUTUT, nonce, deadline, signature } = req.body;
    
    // Validate inputs
    if (!ethers.isAddress(payer)) {
      return res.status(400).json({ error: "Invalid payer address" });
    }
    
    if (!signature || !signature.startsWith("0x")) {
      return res.status(400).json({ error: "Invalid signature" });
    }
    
    // Check deadline hasn't passed
    if (Number(deadline) < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ error: "Signature expired" });
    }
    
    // Check nonce matches
    const currentNonce = await paymentProcessor.nonces(payer);
    if (currentNonce.toString() !== nonce.toString()) {
      return res.status(400).json({ 
        error: "Invalid nonce",
        expected: currentNonce.toString(),
        received: nonce
      });
    }
    
    console.log(`\n📤 Relaying payment from ${payer}`);
    console.log(`   Merchant: ${merchantId}`);
    console.log(`   Amount: ${ethers.formatEther(amount)} ${useUTUT ? "uTUT" : "TUT"}`);
    
    // Submit transaction
    const tx = await paymentProcessor.payWithSignature(
      payer,
      merchantId,
      amount,
      useUTUT,
      nonce,
      deadline,
      signature,
      {
        gasLimit: 300000
      }
    );
    
    console.log(`   TX Hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    // Parse events to get paymentId
    let paymentId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = paymentProcessor.interface.parseLog(log);
        if (parsed?.name === "PaymentProcessed") {
          paymentId = parsed.args.paymentId;
          break;
        }
      } catch (e) {
        // Not our event
      }
    }
    
    console.log(`   ✅ Payment ID: ${paymentId}`);
    
    res.json({
      success: true,
      txHash: tx.hash,
      paymentId,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
    
  } catch (error) {
    console.error("Error relaying payment:", error);
    
    // Parse contract revert reasons
    if (error.data) {
      try {
        const iface = new ethers.Interface(PAYMENT_PROCESSOR_ABI);
        const decoded = iface.parseError(error.data);
        return res.status(400).json({ error: decoded.name });
      } catch (e) {
        // Couldn't decode
      }
    }
    
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

// ============================================================
// GET RELAYER STATUS
// ============================================================
app.get("/status", async (req, res) => {
  try {
    const balance = await provider.getBalance(relayerWallet.address);
    const nonce = await provider.getTransactionCount(relayerWallet.address);
    
    // Calculate if relayer has enough ETH (need at least 0.001 ETH for ~5 txs)
    const hasEnoughGas = balance >= ethers.parseEther("0.001");
    
    res.json({
      relayer: relayerWallet.address,
      balance: ethers.formatEther(balance),
      nonce,
      status: hasEnoughGas ? "operational" : "low_balance",
      minBalance: "0.001 ETH",
      network: "baseSepolia"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 Relayer listening on http://localhost:${PORT}`);
  console.log("\nEndpoints:");
  console.log(`   GET  /health           - Health check`);
  console.log(`   GET  /status           - Relayer status`);
  console.log(`   GET  /nonce/:address   - Get payer nonce`);
  console.log(`   GET  /merchant/:id     - Get merchant info`);
  console.log(`   POST /prepare          - Prepare payment for signing`);
  console.log(`   POST /relay            - Submit signed payment`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down relayer...");
  process.exit(0);
});
