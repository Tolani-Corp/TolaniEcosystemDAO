"use client";

import { CHAIN_IDS } from "@/config/contracts";

export const ZERO_BYTES32 = `0x${"0".repeat(64)}` as `0x${string}`;

export const POS_CHAINS = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    chainId: CHAIN_IDS.BASE_SEPOLIA,
    chainName: "Base Sepolia",
    explorerUrl: "https://sepolia.basescan.org",
    merchantRegistry: "0x17904f65220771fDBAbca6eCcDdAf42345C9571d" as `0x${string}`,
    paymentProcessor: "0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1" as `0x${string}`,
    uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C" as `0x${string}`,
    TUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87" as `0x${string}`,
  },
  [CHAIN_IDS.BASE]: {
    chainId: CHAIN_IDS.BASE,
    chainName: "Base",
    explorerUrl: "https://basescan.org",
    merchantRegistry: "0xE9A1Dd9f175c28C954F961A5eec07D116F1359F3" as `0x${string}`,
    paymentProcessor: "0x51E2c780A513b9C9A76344d376711f603294a2f7" as `0x${string}`,
    uTUT: "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4" as `0x${string}`,
    TUT: "0xAf7e938741a720508897Bf3a13538f6713A337A4" as `0x${string}`,
  },
} as const;

export type PosChainId = keyof typeof POS_CHAINS;
export type PosTokenSymbol = "uTUT" | "TUT";

export const POS_TOKEN_DECIMALS: Record<PosTokenSymbol, number> = {
  uTUT: 6,
  TUT: 18,
};

export const POS_CATEGORIES = [
  "Restaurant",
  "Retail",
  "Services",
  "Education",
  "Healthcare",
  "Transportation",
  "Entertainment",
  "Other",
] as const;

export const POS_STATUS_LABELS = ["Pending", "Active", "Suspended", "Terminated"] as const;

export const MERCHANT_REGISTRY_ABI = [
  {
    name: "registerMerchant",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "businessId", type: "string" },
      { name: "category", type: "uint8" },
      { name: "payoutAddress", type: "address" },
      { name: "acceptsUTUT", type: "bool" },
      { name: "acceptsTUT", type: "bool" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "merchantId", type: "bytes32" }],
  },
  {
    name: "ownerToMerchant",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "getMerchant",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "merchantId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "businessId", type: "string" },
          { name: "category", type: "uint8" },
          { name: "payoutAddress", type: "address" },
          { name: "owner", type: "address" },
          { name: "feeRate", type: "uint256" },
          { name: "acceptsUTUT", type: "bool" },
          { name: "acceptsTUT", type: "bool" },
          { name: "status", type: "uint8" },
          { name: "totalVolume", type: "uint256" },
          { name: "totalTransactions", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
          { name: "lastTransactionAt", type: "uint256" },
          { name: "metadataURI", type: "string" },
        ],
      },
    ],
  },
] as const;

export const PAYMENT_PROCESSOR_ABI = [
  {
    name: "pay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "merchantId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "orderId", type: "bytes32" },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "paymentId", type: "bytes32" }],
  },
  {
    name: "calculateFee",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "merchantId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getNonce",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getRemainingDailyLimit",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "remaining", type: "uint256" }],
  },
] as const;

export const ERC20_POS_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const POS_PAYMENT_TYPES = {
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
} as const;

export interface PosMerchantData {
  name: string;
  businessId: string;
  category: number;
  payoutAddress: `0x${string}`;
  owner: `0x${string}`;
  feeRate: bigint;
  acceptsUTUT: boolean;
  acceptsTUT: boolean;
  status: number;
  totalVolume: bigint;
  totalTransactions: bigint;
  registeredAt: bigint;
  lastTransactionAt: bigint;
  metadataURI: string;
}

export interface PosQrPayload {
  schema: "tolani-pos-payment";
  version: 1;
  chainId: PosChainId;
  merchantId: `0x${string}`;
  amount: string;
  token: PosTokenSymbol;
  orderId: `0x${string}`;
  memo: string;
  createdAt: number;
}

export function getPosConfig(chainId?: number) {
  if (chainId === CHAIN_IDS.BASE) return POS_CHAINS[CHAIN_IDS.BASE];
  return POS_CHAINS[CHAIN_IDS.BASE_SEPOLIA];
}

export function isPosChain(chainId?: number): chainId is PosChainId {
  return chainId === CHAIN_IDS.BASE || chainId === CHAIN_IDS.BASE_SEPOLIA;
}

export function getPosTokenAddress(chainId: number | undefined, token: PosTokenSymbol) {
  return getPosConfig(chainId)[token];
}

export function isValidBytes32(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function parsePosQrPayload(rawValue: string): PosQrPayload | null {
  try {
    const parsed = JSON.parse(rawValue) as Partial<PosQrPayload>;
    if (parsed.schema !== "tolani-pos-payment" || parsed.version !== 1) return null;
    if (!parsed.merchantId || !isValidBytes32(parsed.merchantId)) return null;
    if (parsed.chainId !== CHAIN_IDS.BASE && parsed.chainId !== CHAIN_IDS.BASE_SEPOLIA) return null;
    if (parsed.token !== "uTUT" && parsed.token !== "TUT") return null;
    if (!parsed.amount || Number(parsed.amount) <= 0) return null;
    if (!parsed.orderId || !isValidBytes32(parsed.orderId)) return null;
    return parsed as PosQrPayload;
  } catch {
    return null;
  }
}
