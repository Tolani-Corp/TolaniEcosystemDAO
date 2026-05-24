"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSignTypedData,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, keccak256, maxUint256, parseUnits, toBytes } from "viem";
import {
  ERC20_POS_ABI,
  MERCHANT_REGISTRY_ABI,
  PAYMENT_PROCESSOR_ABI,
  POS_CATEGORIES,
  POS_PAYMENT_TYPES,
  POS_STATUS_LABELS,
  POS_TOKEN_DECIMALS,
  type PosMerchantData,
  type PosQrPayload,
  type PosTokenSymbol,
  getPosConfig,
  getPosTokenAddress,
  isPosChain,
  isValidBytes32,
  parsePosQrPayload,
} from "@/lib/pos";

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3001";

type DetectedBarcode = {
  rawValue: string;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};

type BarcodeWindow = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

type TxResult = {
  success: boolean;
  hash?: string;
  paymentId?: string;
  error?: string;
};

function createOrderId(seed: string) {
  return keccak256(toBytes(`${seed}:${Date.now()}:${Math.random()}`));
}

function formatTokenAmount(value: bigint | undefined, token: PosTokenSymbol) {
  return value ? formatUnits(value, POS_TOKEN_DECIMALS[token]) : "0";
}

function parseTokenAmount(value: string, token: PosTokenSymbol) {
  try {
    return value ? parseUnits(value, POS_TOKEN_DECIMALS[token]) : undefined;
  } catch {
    return undefined;
  }
}

export default function PaymentScanner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const pos = getPosConfig(chainId);
  const networkReady = isPosChain(chainId) && chainId === pos.chainId;

  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  const [paymentData, setPaymentData] = useState<PosQrPayload | null>(null);
  const [manualMerchantId, setManualMerchantId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<PosTokenSymbol>("uTUT");
  const [paymentMethod, setPaymentMethod] = useState<"gasless" | "direct">("gasless");
  const [memo, setMemo] = useState("POS checkout");
  const [manualOrderId, setManualOrderId] = useState(() => createOrderId("manual-pos"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const token = paymentData?.token ?? selectedToken;
  const tokenAddress = getPosTokenAddress(pos.chainId, token);
  const amount = paymentData?.amount ?? manualAmount;
  const merchantId = paymentData?.merchantId ?? (manualMerchantId as `0x${string}`);
  const orderId = paymentData?.orderId ?? manualOrderId;
  const paymentMemo = paymentData?.memo || memo;
  const parsedAmount = useMemo(() => parseTokenAmount(amount, token), [amount, token]);

  const { data: uTUTBalance } = useReadContract({
    address: pos.uTUT,
    abi: ERC20_POS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: pos.chainId,
    query: { enabled: !!address },
  });

  const { data: tutBalance } = useReadContract({
    address: pos.TUT,
    abi: ERC20_POS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: pos.chainId,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_POS_ABI,
    functionName: "allowance",
    args: address ? [address, pos.paymentProcessor] : undefined,
    chainId: pos.chainId,
    query: { enabled: !!address },
  });

  const hasMerchantId = merchantId && isValidBytes32(merchantId);

  const { data: merchantInfo } = useReadContract({
    address: pos.merchantRegistry,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: "getMerchant",
    args: hasMerchantId ? [merchantId] : undefined,
    chainId: pos.chainId,
    query: { enabled: hasMerchantId },
  }) as { data: PosMerchantData | undefined };

  const { data: calculatedFee } = useReadContract({
    address: pos.paymentProcessor,
    abi: PAYMENT_PROCESSOR_ABI,
    functionName: "calculateFee",
    args: hasMerchantId && parsedAmount ? [merchantId, parsedAmount] : undefined,
    chainId: pos.chainId,
    query: { enabled: hasMerchantId && !!parsedAmount },
  });

  const { writeContract: approveToken, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { writeContract: directPay, data: payHash, isPending: isDirectPaying } = useWriteContract();
  const { isLoading: isPayConfirming, isSuccess: isPaySuccess } = useWaitForTransactionReceipt({
    hash: payHash,
  });

  const { signTypedDataAsync } = useSignTypedData();

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isPaySuccess && payHash) {
      setTxResult({ success: true, hash: payHash });
    }
  }, [isPaySuccess, payHash]);

  useEffect(() => {
    if (paymentData) {
      setSelectedToken(paymentData.token);
      setManualAmount(paymentData.amount);
      setManualMerchantId(paymentData.merchantId);
      setMemo(paymentData.memo || "POS checkout");
    }
  }, [paymentData]);

  useEffect(() => {
    if (token === "TUT" && paymentMethod === "gasless") {
      setPaymentMethod("direct");
    }
  }, [paymentMethod, token]);

  const startCamera = useCallback(async () => {
    setScanError(null);
    if (!(window as BarcodeWindow).BarcodeDetector) {
      setScanError("This browser does not support built-in QR scanning. Use manual entry for now.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      setScanError("Camera access failed. Use manual entry for this checkout.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (!isCameraActive) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      const BarcodeDetector = (window as BarcodeWindow).BarcodeDetector;
      if (!BarcodeDetector) return;

      try {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const barcodes = await detector.detect(canvas);
        const payload = barcodes[0] ? parsePosQrPayload(barcodes[0].rawValue) : null;

        if (payload) {
          setPaymentData(payload);
          stopCamera();
        } else if (barcodes.length > 0) {
          setScanError("QR code is not a Tolani POS payment request.");
        }
      } catch {
        // No QR code in this frame.
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isCameraActive, stopCamera]);

  const merchantAcceptsToken = useMemo(() => {
    if (!merchantInfo) return false;
    return token === "uTUT" ? merchantInfo.acceptsUTUT : merchantInfo.acceptsTUT;
  }, [merchantInfo, token]);

  const merchantIsActive = merchantInfo?.status === 1;
  const needsApproval = !!parsedAmount && allowance !== undefined && allowance < parsedAmount;
  const hasBalance = useMemo(() => {
    const balance = token === "uTUT" ? uTUTBalance : tutBalance;
    return !!parsedAmount && balance !== undefined && balance >= parsedAmount;
  }, [parsedAmount, token, tutBalance, uTUTBalance]);

  const resetCheckout = () => {
    setPaymentData(null);
    setManualMerchantId("");
    setManualAmount("");
    setMemo("POS checkout");
    setManualOrderId(createOrderId("manual-pos"));
    setTxResult(null);
    setScanError(null);
  };

  const handleApprove = () => {
    approveToken({
      address: tokenAddress,
      abi: ERC20_POS_ABI,
      functionName: "approve",
      args: [pos.paymentProcessor, maxUint256],
    });
  };

  const handleDirectPayment = () => {
    if (!parsedAmount || !hasMerchantId || !networkReady) return;

    directPay({
      address: pos.paymentProcessor,
      abi: PAYMENT_PROCESSOR_ABI,
      functionName: "pay",
      args: [merchantId, tokenAddress, parsedAmount, orderId, paymentMemo],
    });
  };

  const handleGaslessPayment = async () => {
    if (!parsedAmount || !hasMerchantId || !address || !networkReady) return;

    setIsProcessing(true);
    setTxResult(null);

    try {
      const prepareRes = await fetch(`${RELAYER_URL}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer: address,
          merchantId,
          token: tokenAddress,
          tokenSymbol: token,
          amount,
          orderId,
          memo: paymentMemo,
        }),
      });

      const prepare = await prepareRes.json();
      if (!prepareRes.ok) {
        throw new Error(prepare.error || "Failed to prepare payment");
      }

      const deadline = BigInt(prepare.signData.deadline);
      const nonce = BigInt(prepare.signData.nonce);

      const signature = await signTypedDataAsync({
        domain: {
          name: "TolaniPayments",
          version: "1",
          chainId: pos.chainId,
          verifyingContract: pos.paymentProcessor,
        },
        types: POS_PAYMENT_TYPES,
        primaryType: "Payment",
        message: {
          payer: address,
          merchantId,
          token: tokenAddress,
          amount: parsedAmount,
          orderId,
          memo: paymentMemo,
          nonce,
          deadline,
        },
      });

      const relayRes = await fetch(`${RELAYER_URL}/relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer: address,
          merchantId,
          token: tokenAddress,
          amount: parsedAmount.toString(),
          orderId,
          memo: paymentMemo,
          deadline: deadline.toString(),
          signature,
        }),
      });

      const result = await relayRes.json();
      if (!relayRes.ok) {
        throw new Error(result.error || "Relay failed");
      }

      setTxResult({ success: true, hash: result.txHash, paymentId: result.paymentId });
    } catch (error: unknown) {
      setTxResult({ success: false, error: error instanceof Error ? error.message : "Payment failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">Tolani POS Checkout</h1>
          <p className="text-gray-400">Connect your wallet to pay a registered merchant.</p>
        </div>
      </div>
    );
  }

  const feeText = calculatedFee !== undefined ? formatUnits(calculatedFee, POS_TOKEN_DECIMALS[token]) : "0";
  const merchantNet =
    parsedAmount && calculatedFee !== undefined && parsedAmount >= calculatedFee
      ? formatUnits(parsedAmount - calculatedFee, POS_TOKEN_DECIMALS[token])
      : amount || "0";

  const paymentReady =
    networkReady &&
    merchantInfo &&
    merchantIsActive &&
    merchantAcceptsToken &&
    parsedAmount &&
    hasBalance &&
    !needsApproval;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <p className="text-sm text-cyan-300">{pos.chainName}</p>
          <h1 className="text-3xl font-bold">Tolani POS Checkout</h1>
          <p className="text-gray-400 mt-1">Scan a merchant QR code or enter a merchant ID.</p>
        </div>

        {!networkReady && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-100 mb-3">Switch to {pos.chainName} to complete POS payments.</p>
            <button
              onClick={() => switchChain({ chainId: pos.chainId })}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-950"
            >
              Switch Network
            </button>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-4 mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">uTUT Balance</p>
            <p className="font-semibold">{formatTokenAmount(uTUTBalance, "uTUT")} uTUT</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TUT Balance</p>
            <p className="font-semibold">{formatTokenAmount(tutBalance, "TUT")} TUT</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex-1 rounded-lg py-3 font-semibold ${activeTab === "scan" ? "bg-blue-600" : "bg-gray-900 text-gray-400"}`}
          >
            Scan QR
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 rounded-lg py-3 font-semibold ${activeTab === "manual" ? "bg-blue-600" : "bg-gray-900 text-gray-400"}`}
          >
            Manual
          </button>
        </div>

        {activeTab === "scan" && !paymentData && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            {scanError && <p className="mb-4 text-sm text-yellow-300">{scanError}</p>}
            {!isCameraActive ? (
              <button onClick={startCamera} className="w-full rounded-lg bg-blue-600 py-4 font-bold">
                Start Camera
              </button>
            ) : (
              <div className="space-y-4">
                <video ref={videoRef} className="w-full rounded-lg" playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={stopCamera} className="w-full rounded-lg bg-red-600 py-3 font-semibold">
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "manual" && !paymentData && (
          <div className="bg-gray-900 rounded-lg p-6 space-y-4 mb-6">
            <label className="block">
              <span className="block text-sm text-gray-400 mb-2">Merchant ID</span>
              <input
                value={manualMerchantId}
                onChange={(event) => setManualMerchantId(event.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-3 font-mono text-sm"
                placeholder="0x..."
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-400 mb-2">Amount</span>
              <input
                type="number"
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-3 text-xl"
                placeholder="0.00"
                min="0"
                step="0.000001"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-400 mb-2">Memo</span>
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-3"
                placeholder="Receipt note"
              />
            </label>
          </div>
        )}

        {(paymentData || (manualMerchantId && manualAmount)) && (
          <div className="bg-gray-900 rounded-lg p-6 space-y-5">
            {merchantInfo ? (
              <div>
                <h2 className="text-xl font-bold">{merchantInfo.name}</h2>
                <p className="text-sm text-gray-400">
                  {POS_CATEGORIES[merchantInfo.category] || "Merchant"} · {POS_STATUS_LABELS[merchantInfo.status] || "Unknown"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-yellow-300">Enter a valid merchant ID to load checkout details.</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(["uTUT", "TUT"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedToken(option)}
                  disabled={!!paymentData}
                  className={`rounded-lg border px-4 py-3 font-semibold ${
                    token === option ? "border-blue-400 bg-blue-500/20" : "border-gray-700 bg-gray-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="rounded-lg bg-gray-950 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer pays</span>
                <span>{amount || "0"} {token}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">DAO fee</span>
                <span>{feeText} {token}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Merchant receives</span>
                <span>{merchantNet} {token}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
                <span>Order</span>
                <span className="font-mono">{orderId.slice(0, 10)}...{orderId.slice(-8)}</span>
              </div>
            </div>

            {!merchantIsActive && merchantInfo && <p className="text-sm text-yellow-300">This merchant is not active yet.</p>}
            {merchantInfo && !merchantAcceptsToken && <p className="text-sm text-yellow-300">This merchant does not accept {token}.</p>}
            {parsedAmount && !hasBalance && <p className="text-sm text-yellow-300">Insufficient {token} balance.</p>}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("gasless")}
                disabled={token === "TUT"}
                className={`rounded-lg border py-3 font-semibold ${paymentMethod === "gasless" ? "border-green-400 bg-green-500/20" : "border-gray-700"}`}
              >
                Gasless
              </button>
              <button
                onClick={() => setPaymentMethod("direct")}
                className={`rounded-lg border py-3 font-semibold ${paymentMethod === "direct" ? "border-green-400 bg-green-500/20" : "border-gray-700"}`}
              >
                Direct
              </button>
            </div>
            {token === "TUT" && (
              <p className="text-xs text-gray-500">
                Gasless checkout is limited to uTUT because the deployed daily sponsor limit is denominated in 6-decimal uTUT units.
              </p>
            )}

            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving || isApproveConfirming || !networkReady}
                className="w-full rounded-lg bg-yellow-500 py-4 font-bold text-gray-950 disabled:bg-gray-700 disabled:text-gray-400"
              >
                {isApproving || isApproveConfirming ? "Approving..." : `Approve ${token}`}
              </button>
            ) : (
              <button
                onClick={paymentMethod === "gasless" ? handleGaslessPayment : handleDirectPayment}
                disabled={!paymentReady || isProcessing || isDirectPaying || isPayConfirming}
                className="w-full rounded-lg bg-green-600 py-4 font-bold disabled:bg-gray-700 disabled:text-gray-400"
              >
                {isProcessing || isDirectPaying || isPayConfirming ? "Processing..." : `Pay ${amount || "0"} ${token}`}
              </button>
            )}

            <button onClick={resetCheckout} className="w-full rounded-lg bg-gray-800 py-3 font-semibold">
              Clear Checkout
            </button>
          </div>
        )}

        {txResult && (
          <div className={`mt-6 rounded-lg border p-4 ${txResult.success ? "border-green-600 bg-green-500/10" : "border-red-600 bg-red-500/10"}`}>
            <h3 className={`font-bold ${txResult.success ? "text-green-300" : "text-red-300"}`}>
              {txResult.success ? "Payment successful" : "Payment failed"}
            </h3>
            {txResult.error && <p className="text-sm text-red-200 mt-2">{txResult.error}</p>}
            {txResult.hash && (
              <a
                href={`${pos.explorerUrl}/tx/${txResult.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-300 hover:underline"
              >
                View transaction
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
