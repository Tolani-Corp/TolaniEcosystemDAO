/**
 * Tolani POS Payment Relayer
 *
 * Handles gasless uTUT/TUT checkout for the current TolaniPaymentProcessor v2.
 *
 * Required env:
 *   RELAYER_PRIVATE_KEY or PRIVATE_KEY_OPS
 *   BASE_SEPOLIA_RPC_URL
 *   PAYMENT_PROCESSOR_ADDRESS
 *   MERCHANT_REGISTRY_ADDRESS
 *
 * Optional env:
 *   RELAYER_PORT
 *   UTUT_ADDRESS
 *   MOCK_BRIDGED_TUT_ADDRESS or TUT_ADDRESS
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const rateLimit = require("express-rate-limit");

const PORT = process.env.RELAYER_PORT || process.env.PORT || 3001;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const CHAIN_ID = Number(process.env.POS_CHAIN_ID || 84532);
const PAYMENT_PROCESSOR =
  process.env.PAYMENT_PROCESSOR_ADDRESS ||
  process.env.PAYMENT_PROCESSOR ||
  "0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1";
const MERCHANT_REGISTRY =
  process.env.MERCHANT_REGISTRY_ADDRESS ||
  process.env.MERCHANT_REGISTRY ||
  "0x17904f65220771fDBAbca6eCcDdAf42345C9571d";
const UTUT_ADDRESS = process.env.UTUT_ADDRESS || "0xf4758a12583F424B65CC860A2ff3D3B501cf591C";
const TUT_ADDRESS =
  process.env.TUT_ADDRESS ||
  process.env.MOCK_BRIDGED_TUT_ADDRESS ||
  "0x05AbCD77f178cF43E561091f263Eaa66353Dce87";
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY_OPS || process.env.PRIVATE_KEY;

if (!RELAYER_KEY) {
  throw new Error("Missing RELAYER_PRIVATE_KEY, PRIVATE_KEY_OPS, or PRIVATE_KEY for payment relayer");
}

const TOKENS = {
  [UTUT_ADDRESS.toLowerCase()]: { address: UTUT_ADDRESS, symbol: "uTUT", decimals: 6 },
  [TUT_ADDRESS.toLowerCase()]: { address: TUT_ADDRESS, symbol: "TUT", decimals: 18 },
};

const PAYMENT_PROCESSOR_ABI = [
  "function payWithSignature(address payer, bytes32 merchantId, address token, uint256 amount, bytes32 orderId, string memo, uint256 deadline, bytes signature) external returns (bytes32 paymentId)",
  "function getNonce(address payer) view returns (uint256)",
  "function getRemainingDailyLimit(address payer) view returns (uint256)",
  "function calculateFee(bytes32 merchantId, uint256 amount) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "event PaymentProcessed(bytes32 indexed paymentId, bytes32 indexed merchantId, address indexed payer, address token, uint256 amount, uint256 fee, bytes32 orderId)",
  "event GaslessPayment(bytes32 indexed paymentId, address indexed payer, address indexed relayer)",
];

const MERCHANT_REGISTRY_ABI = [
  "function getMerchant(bytes32) view returns (tuple(string name, string businessId, uint8 category, address payoutAddress, address owner, uint256 feeRate, bool acceptsUTUT, bool acceptsTUT, uint8 status, uint256 totalVolume, uint256 totalTransactions, uint256 registeredAt, uint256 lastTransactionAt, string metadataURI))",
  "function canAcceptPayment(bytes32 merchantId, address token, address uTUTAddress, address TUTAddress) view returns (bool)",
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

const PAYMENT_TYPES = {
  Payment: [
    { name: "payer", type: "address" },
    { name: "merchantId", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "orderId", type: "bytes32" },
    { name: "memo", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: { error: "Too many requests, please try again later" },
  })
);

const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayerWallet = new ethers.Wallet(RELAYER_KEY, provider);
const paymentProcessor = new ethers.Contract(PAYMENT_PROCESSOR, PAYMENT_PROCESSOR_ABI, relayerWallet);
const merchantRegistry = new ethers.Contract(MERCHANT_REGISTRY, MERCHANT_REGISTRY_ABI, provider);

function isBytes32(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function normalizeToken(token, tokenSymbol) {
  if (token && ethers.isAddress(token)) {
    const matched = TOKENS[token.toLowerCase()];
    if (!matched) throw new Error("Unsupported payment token");
    return matched;
  }

  if (tokenSymbol === "TUT") return TOKENS[TUT_ADDRESS.toLowerCase()];
  return TOKENS[UTUT_ADDRESS.toLowerCase()];
}

function parsePaymentAmount(body, tokenConfig) {
  if (body.amountBaseUnits !== undefined) return BigInt(body.amountBaseUnits);
  if (body.amountWei !== undefined) return BigInt(body.amountWei);
  if (body.amount === undefined) throw new Error("Missing amount");
  return ethers.parseUnits(body.amount.toString(), tokenConfig.decimals);
}

async function loadActiveMerchant(merchantId, tokenAddress) {
  const merchant = await merchantRegistry.getMerchant(merchantId);
  if (Number(merchant.status) !== 1) throw new Error("Merchant not active");

  const canAccept = await merchantRegistry.canAcceptPayment(
    merchantId,
    tokenAddress,
    UTUT_ADDRESS,
    TUT_ADDRESS
  );
  if (!canAccept) throw new Error("Merchant cannot accept selected token");

  return merchant;
}

function buildDomain() {
  return {
    name: "TolaniPayments",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract: PAYMENT_PROCESSOR,
  };
}

app.get("/health", async (_req, res) => {
  try {
    const [balance, blockNumber] = await Promise.all([
      provider.getBalance(relayerWallet.address),
      provider.getBlockNumber(),
    ]);

    res.json({
      status: "ok",
      relayer: relayerWallet.address,
      balance: ethers.formatEther(balance),
      chainId: CHAIN_ID,
      blockNumber,
      contracts: {
        paymentProcessor: PAYMENT_PROCESSOR,
        merchantRegistry: MERCHANT_REGISTRY,
        uTUT: UTUT_ADDRESS,
        TUT: TUT_ADDRESS,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.get("/nonce/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) return res.status(400).json({ error: "Invalid address" });

    const [nonce, remainingLimit] = await Promise.all([
      paymentProcessor.getNonce(address),
      paymentProcessor.getRemainingDailyLimit(address),
    ]);

    res.json({
      address,
      nonce: nonce.toString(),
      remainingDailyLimit: remainingLimit.toString(),
      remainingDailyLimitUTUT: ethers.formatUnits(remainingLimit, 6),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/merchant/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    const tokenConfig = normalizeToken(req.query.token, req.query.tokenSymbol);
    if (!isBytes32(merchantId)) return res.status(400).json({ error: "Invalid merchantId" });

    const merchant = await loadActiveMerchant(merchantId, tokenConfig.address);

    res.json({
      merchantId,
      name: merchant.name,
      businessId: merchant.businessId,
      category: Number(merchant.category),
      payoutAddress: merchant.payoutAddress,
      owner: merchant.owner,
      feeRate: merchant.feeRate.toString(),
      acceptsUTUT: merchant.acceptsUTUT,
      acceptsTUT: merchant.acceptsTUT,
      totalVolume: merchant.totalVolume.toString(),
      totalTransactions: merchant.totalTransactions.toString(),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/prepare", async (req, res) => {
  try {
    const { payer, merchantId, orderId, memo = "POS checkout" } = req.body;
    if (!ethers.isAddress(payer)) return res.status(400).json({ error: "Invalid payer address" });
    if (!isBytes32(merchantId)) return res.status(400).json({ error: "Invalid merchantId" });
    if (!isBytes32(orderId)) return res.status(400).json({ error: "Invalid orderId" });

    const tokenConfig = normalizeToken(req.body.token, req.body.tokenSymbol);
    if (tokenConfig.symbol !== "uTUT") {
      return res.status(400).json({
        error: "Gasless checkout is currently limited to uTUT; use direct payment for TUT.",
      });
    }
    const amount = parsePaymentAmount(req.body, tokenConfig);
    if (amount <= 0n) return res.status(400).json({ error: "Amount must be positive" });

    const token = new ethers.Contract(tokenConfig.address, ERC20_ABI, provider);
    await loadActiveMerchant(merchantId, tokenConfig.address);

    const [balance, allowance, nonce, remainingLimit, fee] = await Promise.all([
      token.balanceOf(payer),
      token.allowance(payer, PAYMENT_PROCESSOR),
      paymentProcessor.getNonce(payer),
      paymentProcessor.getRemainingDailyLimit(payer),
      paymentProcessor.calculateFee(merchantId, amount),
    ]);

    if (balance < amount) {
      return res.status(400).json({
        error: "Insufficient token balance",
        balance: balance.toString(),
        required: amount.toString(),
      });
    }

    if (allowance < amount) {
      return res.status(400).json({
        error: "Insufficient allowance",
        allowance: allowance.toString(),
        required: amount.toString(),
        spender: PAYMENT_PROCESSOR,
      });
    }

    if (amount > remainingLimit) {
      return res.status(400).json({
        error: "Daily gasless limit exceeded",
        remainingLimit: remainingLimit.toString(),
        required: amount.toString(),
      });
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const message = {
      payer,
      merchantId,
      token: tokenConfig.address,
      amount: amount.toString(),
      orderId,
      memo,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };

    res.json({
      domain: buildDomain(),
      types: PAYMENT_TYPES,
      primaryType: "Payment",
      message,
      signData: message,
      fee: fee.toString(),
      merchantAmount: (amount - fee).toString(),
      token: tokenConfig,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/relay", async (req, res) => {
  try {
    const { payer, merchantId, token, amount, orderId, memo = "POS checkout", deadline, signature } = req.body;
    if (!ethers.isAddress(payer)) return res.status(400).json({ error: "Invalid payer address" });
    if (!ethers.isAddress(token)) return res.status(400).json({ error: "Invalid token" });
    if (!isBytes32(merchantId)) return res.status(400).json({ error: "Invalid merchantId" });
    if (!isBytes32(orderId)) return res.status(400).json({ error: "Invalid orderId" });
    if (!signature || !signature.startsWith("0x")) return res.status(400).json({ error: "Invalid signature" });
    if (Number(deadline) < Math.floor(Date.now() / 1000)) return res.status(400).json({ error: "Signature expired" });

    const tokenConfig = normalizeToken(token);
    if (tokenConfig.symbol !== "uTUT") {
      return res.status(400).json({ error: "Gasless checkout is currently limited to uTUT." });
    }
    await loadActiveMerchant(merchantId, token);

    const tx = await paymentProcessor.payWithSignature(
      payer,
      merchantId,
      token,
      BigInt(amount),
      orderId,
      memo,
      BigInt(deadline),
      signature,
      { gasLimit: 350000 }
    );

    const receipt = await tx.wait();
    let paymentId = null;

    for (const log of receipt.logs) {
      try {
        const parsed = paymentProcessor.interface.parseLog(log);
        if (parsed?.name === "PaymentProcessed") {
          paymentId = parsed.args.paymentId;
          break;
        }
      } catch {
        // Ignore logs emitted by token/registry contracts.
      }
    }

    res.json({
      success: true,
      txHash: tx.hash,
      paymentId,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (error) {
    if (error.data) {
      try {
        const decoded = paymentProcessor.interface.parseError(error.data);
        return res.status(400).json({ error: decoded.name });
      } catch {
        // Fall through to generic error.
      }
    }
    res.status(500).json({ error: error.message, code: error.code });
  }
});

app.listen(PORT, () => {
  console.log("Tolani POS Payment Relayer");
  console.log(`Relayer: ${relayerWallet.address}`);
  console.log(`PaymentProcessor: ${PAYMENT_PROCESSOR}`);
  console.log(`MerchantRegistry: ${MERCHANT_REGISTRY}`);
  console.log(`Listening: http://localhost:${PORT}`);
});
