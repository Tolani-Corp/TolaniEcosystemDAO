'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { parseUnits, formatUnits, formatEther, maxUint256 } from 'viem';

// Contract addresses on Base Sepolia
const PAYMENT_PROCESSOR = '0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1';

// Token decimals
const UTUT_DECIMALS = 6;
const TUT_DECIMALS = 18;
const MERCHANT_REGISTRY = '0x17904f65220771fDBAbca6eCcDdAf42345C9571d';
const UTUT_ADDRESS = '0xf4758a12583F424B65CC860A2ff3D3B501cf591C';
const TUT_ADDRESS = '0x05AbCD77f178cF43E561091f263Eaa66353Dce87';

// Relayer endpoint
const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

// ABIs
const MERCHANT_REGISTRY_ABI = [
  {
    name: 'getMerchant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'merchantId', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'name', type: 'string' },
        { name: 'businessId', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'payoutAddress', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'feeRate', type: 'uint256' },
        { name: 'acceptsUTUT', type: 'bool' },
        { name: 'acceptsTUT', type: 'bool' },
        { name: 'status', type: 'uint8' },
        { name: 'totalVolume', type: 'uint256' },
        { name: 'totalTransactions', type: 'uint256' },
        { name: 'registeredAt', type: 'uint256' },
        { name: 'lastTransactionAt', type: 'uint256' },
        { name: 'metadataURI', type: 'string' }
      ]
    }]
  },
  {
    name: 'isActiveMerchant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'merchantId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

const PAYMENT_PROCESSOR_ABI = [
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'merchantId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'useUTUT', type: 'bool' }
    ],
    outputs: [{ name: 'paymentId', type: 'bytes32' }]
  }
] as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// EIP-712 domain for signing
const DOMAIN = {
  name: 'TolaniPaymentProcessor',
  version: '1',
  chainId: 84532,
  verifyingContract: PAYMENT_PROCESSOR as `0x${string}`
} as const;

const PAYMENT_TYPES = {
  GaslessPayment: [
    { name: 'payer', type: 'address' },
    { name: 'merchantId', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'useUTUT', type: 'bool' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
} as const;

interface PaymentData {
  merchantId: `0x${string}`;
  amount: string;
  useUTUT: boolean;
  timestamp?: number;
}

interface MerchantInfo {
  name: string;
  category: number;
  feeRate: bigint;
  acceptsUTUT: boolean;
  acceptsTUT: boolean;
}

const CATEGORIES = [
  'Retail',
  'Food & Beverage', 
  'Services',
  'Education',
  'Technology',
  'Healthcare',
  'Entertainment',
  'Other'
];

export default function PaymentScanner() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  
  // Payment state
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [manualMerchantId, setManualMerchantId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [useUTUT, setUseUTUT] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'gasless'>('gasless');
  
  // Transaction state
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; hash?: string; error?: string } | null>(null);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Token balances
  const { data: uTUTBalance } = useReadContract({
    address: UTUT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  const { data: tutBalance } = useReadContract({
    address: TUT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  // Token allowances
  const { data: uTUTAllowance, refetch: refetchAllowance } = useReadContract({
    address: UTUT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, PAYMENT_PROCESSOR] : undefined,
    query: { enabled: !!address }
  });
  
  // Merchant info for current payment
  const merchantId = paymentData?.merchantId || (manualMerchantId as `0x${string}`);
  const { data: merchantInfo } = useReadContract({
    address: MERCHANT_REGISTRY,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: 'getMerchant',
    args: merchantId && merchantId.length === 66 ? [merchantId] : undefined,
    query: { enabled: !!merchantId && merchantId.length === 66 }
  }) as { data: MerchantInfo | undefined };
  
  // Contract write for direct payment
  const { writeContract: directPay, data: payHash, isPending: isDirectPaying } = useWriteContract();
  const { isLoading: isPayConfirming, isSuccess: isPaySuccess } = useWaitForTransactionReceipt({
    hash: payHash
  });
  
  // Contract write for approval
  const { writeContract: approveToken, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash
  });
  
  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);
  
  // Sign typed data for gasless payment
  const { signTypedDataAsync } = useSignTypedData();
  
  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please use manual entry.');
    }
  }, []);
  
  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);
  
  // Scan QR code from video feed
  useEffect(() => {
    if (!isCameraActive) return;
    
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore - BarcodeDetector is not in TS types yet
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          
          if (barcodes.length > 0) {
            const data = JSON.parse(barcodes[0].rawValue);
            setPaymentData(data);
            stopCamera();
          }
        } catch (error) {
          // QR not found in this frame
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isCameraActive, stopCamera]);
  
  // Handle approval
  const handleApprove = () => {
    const tokenAddress = useUTUT ? UTUT_ADDRESS : TUT_ADDRESS;
    
    approveToken({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [PAYMENT_PROCESSOR, maxUint256]
    });
  };
  
  // Handle direct payment
  const handleDirectPayment = () => {
    const amount = paymentData?.amount || manualAmount;
    const mId = paymentData?.merchantId || (manualMerchantId as `0x${string}`);
    
    if (!amount || !mId) return;
    
    // Parse amount based on selected token (uTUT = 6 decimals, TUT = 18 decimals)
    const parsedAmount = useUTUT 
      ? parseUnits(amount, UTUT_DECIMALS)
      : parseUnits(amount, TUT_DECIMALS);
    
    directPay({
      address: PAYMENT_PROCESSOR,
      abi: PAYMENT_PROCESSOR_ABI,
      functionName: 'pay',
      args: [mId, parsedAmount, useUTUT]
    });
  };
  
  // Handle gasless payment via relayer
  const handleGaslessPayment = async () => {
    const amount = paymentData?.amount || manualAmount;
    const mId = paymentData?.merchantId || manualMerchantId;
    
    if (!amount || !mId || !address) return;
    
    setIsProcessing(true);
    setTxResult(null);
    
    try {
      // 1. Get signing data from relayer
      const prepareRes = await fetch(`${RELAYER_URL}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer: address,
          merchantId: mId,
          amount,
          useUTUT
        })
      });
      
      if (!prepareRes.ok) {
        const err = await prepareRes.json();
        throw new Error(err.error || 'Failed to prepare payment');
      }
      
      const { signData } = await prepareRes.json();
      
      // 2. Sign the payment message
      const signature = await signTypedDataAsync({
        domain: DOMAIN,
        types: PAYMENT_TYPES,
        primaryType: 'GaslessPayment',
        message: {
          payer: address,
          merchantId: mId as `0x${string}`,
          amount: BigInt(signData.amount),
          useUTUT,
          nonce: BigInt(signData.nonce),
          deadline: BigInt(signData.deadline)
        }
      });
      
      // 3. Submit to relayer
      const relayRes = await fetch(`${RELAYER_URL}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer: address,
          merchantId: mId,
          amount: signData.amount,
          useUTUT,
          nonce: signData.nonce,
          deadline: signData.deadline,
          signature
        })
      });
      
      const result = await relayRes.json();
      
      if (!relayRes.ok) {
        throw new Error(result.error || 'Relay failed');
      }
      
      setTxResult({ success: true, hash: result.txHash });
      
    } catch (error: any) {
      console.error('Gasless payment error:', error);
      setTxResult({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Calculate amount after fee
  const amount = paymentData?.amount || manualAmount;
  const feeRate = merchantInfo ? Number(merchantInfo.feeRate) / 10000 : 0.02;
  const fee = amount ? Number(amount) * feeRate : 0;
  const total = amount ? Number(amount) : 0;
  
  // Check if approval needed (compare using proper decimals)
  const needsApproval = uTUTAllowance !== undefined && 
    amount && 
    uTUTAllowance < parseUnits(amount, UTUT_DECIMALS);
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Pay with TolaniDAO</h1>
          <p className="text-gray-400">Connect your wallet to make payments</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2">💳 Pay with TolaniDAO</h1>
        <p className="text-gray-400 mb-6">Scan QR code or enter merchant details</p>
        
        {/* Balance Display */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">uTUT Balance:</span>
            <span className="font-semibold">
              {uTUTBalance ? formatUnits(uTUTBalance, UTUT_DECIMALS) : '0'} uTUT
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">TUT Balance:</span>
            <span className="font-semibold">
              {tutBalance ? formatEther(tutBalance) : '0'} TUT
            </span>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📷 Scan QR
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ✏️ Manual
          </button>
        </div>
        
        {/* QR Scanner */}
        {activeTab === 'scan' && !paymentData && (
          <div className="bg-gray-800 rounded-xl p-6">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-lg font-bold text-lg"
              >
                Start Camera
              </button>
            ) : (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={stopCamera}
                  className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Manual Entry */}
        {activeTab === 'manual' && !paymentData && (
          <div className="bg-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Merchant ID
              </label>
              <input
                type="text"
                value={manualMerchantId}
                onChange={(e) => setManualMerchantId(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white text-xl"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
        )}
        
        {/* Payment Confirmation */}
        {(paymentData || (manualMerchantId && manualAmount)) && merchantInfo && (
          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">{merchantInfo.name}</h3>
              <p className="text-gray-400">{CATEGORIES[merchantInfo.category]}</p>
            </div>
            
            {/* Amount breakdown */}
            <div className="space-y-2 border-t border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span>{amount} {useUTUT ? 'uTUT' : 'TUT'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fee ({(feeRate * 100).toFixed(2)}%)</span>
                <span>{fee.toFixed(4)} {useUTUT ? 'uTUT' : 'TUT'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-700 pt-2">
                <span>Total</span>
                <span>{total} {useUTUT ? 'uTUT' : 'TUT'}</span>
              </div>
            </div>
            
            {/* Token selection */}
            <div className="flex space-x-4">
              <button
                onClick={() => setUseUTUT(true)}
                className={`flex-1 py-2 rounded-lg border-2 transition ${
                  useUTUT ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'
                }`}
              >
                uTUT
              </button>
              <button
                onClick={() => setUseUTUT(false)}
                className={`flex-1 py-2 rounded-lg border-2 transition ${
                  !useUTUT ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'
                }`}
              >
                TUT
              </button>
            </div>
            
            {/* Payment method */}
            <div className="flex space-x-4">
              <button
                onClick={() => setPaymentMethod('gasless')}
                className={`flex-1 py-2 rounded-lg border-2 transition ${
                  paymentMethod === 'gasless' ? 'border-green-500 bg-green-900/30' : 'border-gray-600'
                }`}
              >
                ⚡ Gasless
              </button>
              <button
                onClick={() => setPaymentMethod('direct')}
                className={`flex-1 py-2 rounded-lg border-2 transition ${
                  paymentMethod === 'direct' ? 'border-green-500 bg-green-900/30' : 'border-gray-600'
                }`}
              >
                💨 Direct
              </button>
            </div>
            
            {/* Action buttons */}
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving || isApproveConfirming}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 py-4 rounded-lg font-bold text-lg"
              >
                {isApproving || isApproveConfirming ? 'Approving...' : `Approve ${useUTUT ? 'uTUT' : 'TUT'}`}
              </button>
            ) : (
              <button
                onClick={paymentMethod === 'gasless' ? handleGaslessPayment : handleDirectPayment}
                disabled={isProcessing || isDirectPaying || isPayConfirming}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-4 rounded-lg font-bold text-lg"
              >
                {isProcessing || isDirectPaying || isPayConfirming 
                  ? 'Processing...' 
                  : `Pay ${total} ${useUTUT ? 'uTUT' : 'TUT'}`}
              </button>
            )}
            
            {/* Cancel button */}
            <button
              onClick={() => {
                setPaymentData(null);
                setManualMerchantId('');
                setManualAmount('');
                setTxResult(null);
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        )}
        
        {/* Transaction Result */}
        {txResult && (
          <div className={`mt-6 p-4 rounded-xl ${
            txResult.success ? 'bg-green-900/50 border border-green-600' : 'bg-red-900/50 border border-red-600'
          }`}>
            {txResult.success ? (
              <>
                <h3 className="font-bold text-green-400 mb-2">✅ Payment Successful!</h3>
                <a
                  href={`https://sepolia.basescan.org/tx/${txResult.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline"
                >
                  View on Basescan →
                </a>
              </>
            ) : (
              <>
                <h3 className="font-bold text-red-400 mb-2">❌ Payment Failed</h3>
                <p className="text-sm text-red-300">{txResult.error}</p>
              </>
            )}
          </div>
        )}
        
        {isPaySuccess && (
          <div className="mt-6 p-4 rounded-xl bg-green-900/50 border border-green-600">
            <h3 className="font-bold text-green-400 mb-2">✅ Payment Successful!</h3>
            <a
              href={`https://sepolia.basescan.org/tx/${payHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-sm hover:underline"
            >
              View on Basescan →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
