"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatUnits, isAddress, keccak256, toBytes } from "viem";
import { QRCodeSVG } from "qrcode.react";
import {
  MERCHANT_REGISTRY_ABI,
  POS_CATEGORIES,
  POS_STATUS_LABELS,
  POS_TOKEN_DECIMALS,
  ZERO_BYTES32,
  type PosMerchantData,
  type PosQrPayload,
  type PosTokenSymbol,
  getPosConfig,
  isPosChain,
} from "@/lib/pos";

function createOrderId(seed: string) {
  return keccak256(toBytes(`${seed}:${Date.now()}:${Math.random()}`));
}

export default function MerchantDashboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const pos = getPosConfig(chainId);
  const networkReady = isPosChain(chainId) && chainId === pos.chainId;

  const [activeTab, setActiveTab] = useState<"register" | "dashboard" | "receive">("register");
  const [formData, setFormData] = useState({
    name: "",
    businessId: "",
    category: 1,
    payoutAddress: "",
    acceptsUTUT: true,
    acceptsTUT: true,
    metadataURI: "",
  });
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveToken, setReceiveToken] = useState<PosTokenSymbol>("uTUT");
  const [receiveMemo, setReceiveMemo] = useState("POS sale");
  const [qrData, setQrData] = useState<string | null>(null);

  const { data: merchantId, refetch: refetchMerchantId } = useReadContract({
    address: pos.merchantRegistry,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: "ownerToMerchant",
    args: address ? [address] : undefined,
    chainId: pos.chainId,
    query: { enabled: !!address },
  });

  const hasMerchant = !!merchantId && merchantId !== ZERO_BYTES32;

  const { data: merchantData, refetch: refetchMerchant } = useReadContract({
    address: pos.merchantRegistry,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: "getMerchant",
    args: hasMerchant ? [merchantId] : undefined,
    chainId: pos.chainId,
    query: { enabled: hasMerchant },
  }) as { data: PosMerchantData | undefined; refetch: () => void };

  const { writeContract: registerMerchant, data: registerHash, isPending: isRegistering } = useWriteContract();
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  useEffect(() => {
    if (isRegisterSuccess) {
      refetchMerchantId();
      refetchMerchant();
      queueMicrotask(() => setActiveTab("dashboard"));
    }
  }, [isRegisterSuccess, refetchMerchant, refetchMerchantId]);

  useEffect(() => {
    if (hasMerchant) {
      queueMicrotask(() => setActiveTab("dashboard"));
    }
  }, [hasMerchant]);

  const merchantCanReceive = useMemo(() => {
    if (!merchantData || merchantData.status !== 1) return false;
    return receiveToken === "uTUT" ? merchantData.acceptsUTUT : merchantData.acceptsTUT;
  }, [merchantData, receiveToken]);

  const handleRegister = () => {
    if (!address || !networkReady) return;
    const payoutAddress = formData.payoutAddress.trim() || address;
    if (!isAddress(payoutAddress)) return;

    registerMerchant({
      address: pos.merchantRegistry,
      abi: MERCHANT_REGISTRY_ABI,
      functionName: "registerMerchant",
      args: [
        formData.name.trim(),
        formData.businessId.trim(),
        formData.category,
        payoutAddress,
        formData.acceptsUTUT,
        formData.acceptsTUT,
        formData.metadataURI.trim(),
      ],
    });
  };

  const generatePaymentQR = () => {
    if (!merchantId || !receiveAmount || Number(receiveAmount) <= 0 || !merchantCanReceive) return;

    const payload: PosQrPayload = {
      schema: "tolani-pos-payment",
      version: 1,
      chainId: pos.chainId,
      merchantId,
      amount: receiveAmount,
      token: receiveToken,
      orderId: createOrderId(`${merchantId}:${receiveAmount}:${receiveToken}`),
      memo: receiveMemo,
      createdAt: Date.now(),
    };

    setQrData(JSON.stringify(payload));
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-800/70 bg-gray-900/50 p-8 text-center text-white">
        <h2 className="text-2xl font-bold">Tolani Merchant POS</h2>
        <p className="mt-2 text-gray-400">Connect your wallet to register or run a checkout terminal.</p>
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-emerald-300">{pos.chainName}</p>
          <h1 className="text-3xl font-bold">Tolani Merchant POS</h1>
          <p className="text-gray-400 mt-1">Register merchants and generate QR checkout requests for uTUT/TUT payments.</p>
        </div>

        {!networkReady && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-100 mb-3">Switch to {pos.chainName} to manage this POS terminal.</p>
            <button
              onClick={() => switchChain({ chainId: pos.chainId })}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-950"
            >
              Switch Network
            </button>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          {!hasMerchant && (
            <button
              onClick={() => setActiveTab("register")}
              className={`rounded-lg px-5 py-3 font-semibold ${activeTab === "register" ? "bg-blue-600" : "bg-gray-900 text-gray-400"}`}
            >
              Register
            </button>
          )}
          {hasMerchant && (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`rounded-lg px-5 py-3 font-semibold ${activeTab === "dashboard" ? "bg-blue-600" : "bg-gray-900 text-gray-400"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("receive")}
                className={`rounded-lg px-5 py-3 font-semibold ${activeTab === "receive" ? "bg-green-600" : "bg-gray-900 text-gray-400"}`}
              >
                Receive Payment
              </button>
            </>
          )}
        </div>

        {activeTab === "register" && !hasMerchant && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-5">Register Merchant</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <label>
                <span className="block text-sm text-gray-400 mb-2">Business Name</span>
                <input
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                  placeholder="Business name"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-400 mb-2">Business ID</span>
                <input
                  value={formData.businessId}
                  onChange={(event) => setFormData({ ...formData, businessId: event.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                  placeholder="Registration number"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-400 mb-2">Category</span>
                <select
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: Number(event.target.value) })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                >
                  {POS_CATEGORIES.map((category, index) => (
                    <option key={category} value={index}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-sm text-gray-400 mb-2">Payout Address</span>
                <input
                  value={formData.payoutAddress}
                  onChange={(event) => setFormData({ ...formData, payoutAddress: event.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3 font-mono text-sm"
                  placeholder={address}
                />
              </label>
              <label className="md:col-span-2">
                <span className="block text-sm text-gray-400 mb-2">Metadata URI</span>
                <input
                  value={formData.metadataURI}
                  onChange={(event) => setFormData({ ...formData, metadataURI: event.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                  placeholder="ipfs://... or HTTPS URL"
                />
              </label>
            </div>

            <div className="flex gap-6 my-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsUTUT}
                  onChange={(event) => setFormData({ ...formData, acceptsUTUT: event.target.checked })}
                  className="h-5 w-5"
                />
                Accept uTUT
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsTUT}
                  onChange={(event) => setFormData({ ...formData, acceptsTUT: event.target.checked })}
                  className="h-5 w-5"
                />
                Accept TUT
              </label>
            </div>

            <button
              onClick={handleRegister}
              disabled={!networkReady || !formData.name.trim() || isRegistering || isRegisterConfirming}
              className="w-full rounded-lg bg-blue-600 py-4 font-bold disabled:bg-gray-700 disabled:text-gray-400"
            >
              {isRegistering || isRegisterConfirming ? "Registering..." : "Register Merchant"}
            </button>
            <p className="text-sm text-gray-500 text-center mt-4">
              New merchants start as pending and must be activated by a verifier before checkout can run.
            </p>
          </div>
        )}

        {activeTab === "dashboard" && merchantData && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{merchantData.name}</h2>
                <p className="text-gray-400">{POS_CATEGORIES[merchantData.category] || "Merchant"}</p>
                <p className="text-xs text-gray-500 font-mono mt-3">{merchantId}</p>
              </div>
              <span className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                merchantData.status === 1 ? "bg-green-600" : merchantData.status === 0 ? "bg-yellow-600" : "bg-red-600"
              }`}>
                {POS_STATUS_LABELS[merchantData.status] || "Unknown"}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-5">
                <p className="text-sm text-gray-400">Total Volume</p>
                <p className="text-2xl font-bold">{formatUnits(merchantData.totalVolume, POS_TOKEN_DECIMALS.uTUT)} uTUT</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-5">
                <p className="text-sm text-gray-400">Transactions</p>
                <p className="text-2xl font-bold">{merchantData.totalTransactions.toString()}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-5">
                <p className="text-sm text-gray-400">Fee Rate</p>
                <p className="text-2xl font-bold">{(Number(merchantData.feeRate) / 100).toFixed(2)}%</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Payout Address</p>
                <p className="font-mono">{merchantData.payoutAddress}</p>
              </div>
              <div>
                <p className="text-gray-500">Accepted Tokens</p>
                <p>{[merchantData.acceptsUTUT && "uTUT", merchantData.acceptsTUT && "TUT"].filter(Boolean).join(", ")}</p>
              </div>
              <div>
                <p className="text-gray-500">Registered</p>
                <p>{new Date(Number(merchantData.registeredAt) * 1000).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Business ID</p>
                <p>{merchantData.businessId || "Not provided"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "receive" && hasMerchant && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-5">Receive Payment</h2>
            {merchantData?.status !== 1 && (
              <p className="mb-5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                This merchant must be active before it can receive payments.
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-5">
              <label>
                <span className="block text-sm text-gray-400 mb-2">Amount</span>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(event) => setReceiveAmount(event.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3 text-xl"
                  placeholder="0.00"
                  min="0"
                  step="0.000001"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-400 mb-2">Token</span>
                <select
                  value={receiveToken}
                  onChange={(event) => setReceiveToken(event.target.value as PosTokenSymbol)}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                >
                  <option value="uTUT" disabled={merchantData ? !merchantData.acceptsUTUT : false}>uTUT</option>
                  <option value="TUT" disabled={merchantData ? !merchantData.acceptsTUT : false}>TUT</option>
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="block text-sm text-gray-400 mb-2">Receipt Memo</span>
                <input
                  value={receiveMemo}
                  onChange={(event) => setReceiveMemo(event.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3"
                  placeholder="Order number, table, customer, or invoice"
                />
              </label>
            </div>

            <button
              onClick={generatePaymentQR}
              disabled={!networkReady || !receiveAmount || Number(receiveAmount) <= 0 || !merchantCanReceive}
              className="mt-6 w-full rounded-lg bg-green-600 py-4 font-bold disabled:bg-gray-700 disabled:text-gray-400"
            >
              Generate QR Code
            </button>

            {qrData && (
              <div className="mt-8 flex flex-col items-center rounded-lg bg-white p-6 text-gray-950">
                <QRCodeSVG value={qrData} size={256} level="H" includeMargin />
                <p className="mt-4 text-lg font-bold">{receiveAmount} {receiveToken}</p>
                <p className="text-sm text-gray-500">Scan to pay with Tolani POS</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
