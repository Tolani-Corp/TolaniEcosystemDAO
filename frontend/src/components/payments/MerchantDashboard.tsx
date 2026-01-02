'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, isAddress, keccak256, encodePacked } from 'viem';
import { QRCodeSVG } from 'qrcode.react';

// Contract addresses on Base Sepolia
const MERCHANT_REGISTRY = '0x17904f65220771fDBAbca6eCcDdAf42345C9571d';
const PAYMENT_PROCESSOR = '0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1';
const UTUT_ADDRESS = '0xf4758a12583F424B65CC860A2ff3D3B501cf591C';

// Token decimals
const UTUT_DECIMALS = 6;

// Relayer endpoint
const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

// Contract ABIs
const MERCHANT_REGISTRY_ABI = [
  {
    name: 'requestMerchantRegistration',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'businessId', type: 'string' },
      { name: 'category', type: 'uint8' },
      { name: 'payoutAddress', type: 'address' },
      { name: 'acceptsUTUT', type: 'bool' },
      { name: 'acceptsTUT', type: 'bool' },
      { name: 'metadataURI', type: 'string' }
    ],
    outputs: [{ name: 'merchantId', type: 'bytes32' }]
  },
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
    name: 'ownerToMerchant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }]
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
  },
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'address', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
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

// Merchant categories
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

// Merchant status
const STATUS_LABELS = ['Pending', 'Active', 'Suspended', 'Banned'];

interface MerchantData {
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

export default function MerchantDashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'register' | 'dashboard' | 'receive'>('register');
  
  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    businessId: '',
    category: 0,
    payoutAddress: '',
    acceptsUTUT: true,
    acceptsTUT: true
  });
  
  // Payment receive state
  const [receiveAmount, setReceiveAmount] = useState('');
  const [qrData, setQrData] = useState<string | null>(null);
  
  // Check if user has a merchant account
  const { data: merchantId } = useReadContract({
    address: MERCHANT_REGISTRY,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: 'ownerToMerchant',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  // Get merchant data if exists
  const { data: merchantData, refetch: refetchMerchant } = useReadContract({
    address: MERCHANT_REGISTRY,
    abi: MERCHANT_REGISTRY_ABI,
    functionName: 'getMerchant',
    args: merchantId && merchantId !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
      ? [merchantId] 
      : undefined,
    query: { 
      enabled: !!merchantId && merchantId !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
    }
  }) as { data: MerchantData | undefined, refetch: () => void };
  
  // Registration transaction
  const { writeContract: registerMerchant, data: registerHash, isPending: isRegistering } = useWriteContract();
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash
  });
  
  // Switch to dashboard after successful registration
  useEffect(() => {
    if (isRegisterSuccess) {
      refetchMerchant();
      setActiveTab('dashboard');
    }
  }, [isRegisterSuccess, refetchMerchant]);
  
  // Generate QR code for receiving payments
  const generatePaymentQR = () => {
    if (!merchantId || !receiveAmount) return;
    
    const paymentData = {
      merchantId,
      amount: receiveAmount,
      useUTUT: true,
      timestamp: Date.now()
    };
    
    setQrData(JSON.stringify(paymentData));
  };
  
  // Handle registration submit
  const handleRegister = () => {
    if (!address) return;
    
    const payoutAddr = (formData.payoutAddress || address) as `0x${string}`;
    
    registerMerchant({
      address: MERCHANT_REGISTRY,
      abi: MERCHANT_REGISTRY_ABI,
      functionName: 'requestMerchantRegistration',
      args: [
        formData.name,
        formData.businessId,
        formData.category,
        payoutAddr,
        formData.acceptsUTUT,
        formData.acceptsTUT,
        '' // metadataURI
      ]
    });
  };
  
  // Check if merchant exists
  const hasMerchant = merchantId && merchantId !== '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Merchant Dashboard</h1>
          <p className="text-gray-400">Connect your wallet to continue</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🏪 Merchant Dashboard</h1>
        <p className="text-gray-400 mb-8">Accept uTUT/TUT payments from DAO members</p>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          {!hasMerchant && (
            <button
              onClick={() => setActiveTab('register')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Register
            </button>
          )}
          
          {hasMerchant && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Dashboard
              </button>
              
              <button
                onClick={() => setActiveTab('receive')}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'receive'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Receive Payment
              </button>
            </>
          )}
        </div>
        
        {/* Registration Form */}
        {activeTab === 'register' && !hasMerchant && (
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-6">Register as Merchant</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your business name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Business ID / Registration Number
                </label>
                <input
                  type="text"
                  value={formData.businessId}
                  onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: Number(e.target.value) })}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={idx}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Payout Address
                </label>
                <input
                  type="text"
                  value={formData.payoutAddress}
                  onChange={(e) => setFormData({ ...formData, payoutAddress: e.target.value })}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={`Default: ${address?.slice(0, 10)}...`}
                />
              </div>
              
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptsUTUT}
                    onChange={(e) => setFormData({ ...formData, acceptsUTUT: e.target.checked })}
                    className="w-5 h-5 rounded bg-gray-700"
                  />
                  <span>Accept uTUT</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptsTUT}
                    onChange={(e) => setFormData({ ...formData, acceptsTUT: e.target.checked })}
                    className="w-5 h-5 rounded bg-gray-700"
                  />
                  <span>Accept TUT</span>
                </label>
              </div>
              
              <button
                onClick={handleRegister}
                disabled={!formData.name || isRegistering || isRegisterConfirming}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-4 rounded-lg font-bold text-lg transition"
              >
                {isRegistering || isRegisterConfirming ? 'Processing...' : 'Register Merchant'}
              </button>
              
              <p className="text-sm text-gray-500 text-center">
                Registration requires admin approval before you can receive payments.
              </p>
            </div>
          </div>
        )}
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' && merchantData && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{merchantData.name}</h2>
                  <p className="text-gray-400">{CATEGORIES[merchantData.category]}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  merchantData.status === 1 ? 'bg-green-600' :
                  merchantData.status === 0 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}>
                  {STATUS_LABELS[merchantData.status]}
                </span>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold">
                  {formatUnits(merchantData.totalVolume, UTUT_DECIMALS)} uTUT
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">Transactions</p>
                <p className="text-2xl font-bold">
                  {merchantData.totalTransactions.toString()}
                </p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">Fee Rate</p>
                <p className="text-2xl font-bold">
                  {(Number(merchantData.feeRate) / 100).toFixed(2)}%
                </p>
              </div>
            </div>
            
            {/* Details */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">Merchant Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Merchant ID</span>
                  <span className="font-mono">{merchantId?.slice(0, 18)}...</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Payout Address</span>
                  <span className="font-mono">
                    {merchantData.payoutAddress.slice(0, 10)}...{merchantData.payoutAddress.slice(-8)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Accepts</span>
                  <span>
                    {merchantData.acceptsUTUT && 'uTUT '}
                    {merchantData.acceptsTUT && 'TUT'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Registered</span>
                  <span>
                    {new Date(Number(merchantData.registeredAt) * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Receive Payment View */}
        {activeTab === 'receive' && hasMerchant && (
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-6">Receive Payment</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount (uTUT)
                </label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white text-xl focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <button
                onClick={generatePaymentQR}
                disabled={!receiveAmount || Number(receiveAmount) <= 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-4 rounded-lg font-bold text-lg transition"
              >
                Generate QR Code
              </button>
              
              {qrData && (
                <div className="flex flex-col items-center mt-8 p-6 bg-white rounded-xl">
                  <QRCodeSVG
                    value={qrData}
                    size={256}
                    level="H"
                    includeMargin
                  />
                  <p className="text-gray-800 mt-4 font-semibold">
                    {receiveAmount} uTUT
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Scan to pay with TolaniDAO
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
