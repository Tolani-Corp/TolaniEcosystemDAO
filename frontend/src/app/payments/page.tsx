'use client';

import { useState } from 'react';
import MerchantDashboard from '@/components/payments/MerchantDashboard';
import PaymentScanner from '@/components/payments/PaymentScanner';

export default function PaymentsPage() {
  const [mode, setMode] = useState<'pay' | 'merchant'>('pay');
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-800 rounded-full p-1 flex">
          <button
            onClick={() => setMode('pay')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              mode === 'pay'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💳 Pay
          </button>
          <button
            onClick={() => setMode('merchant')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              mode === 'merchant'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏪 Merchant
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      {mode === 'pay' ? <PaymentScanner /> : <MerchantDashboard />}
    </div>
  );
}
