'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { isSupportedChain, getChainName, SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN_ID } from '@/config/contracts';

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  // If not connected or on supported chain, render children
  if (!isConnected || isSupportedChain(chainId)) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-yellow-500/50 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Wrong Network</h2>
        
        <p className="text-gray-400 mb-6">
          You&apos;re connected to <span className="text-white font-medium">{getChainName(chainId)}</span>.
          <br />
          Please switch to a supported network.
        </p>

        <div className="space-y-3">
          {SUPPORTED_CHAIN_IDS.map((id) => (
            <button
              key={id}
              onClick={() => switchChain?.({ chainId: id })}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                id === DEFAULT_CHAIN_ID
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              Switch to {getChainName(id)}
              {id === DEFAULT_CHAIN_ID && ' (Recommended)'}
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-sm mt-4">
          Supported: {SUPPORTED_CHAIN_IDS.map(getChainName).join(', ')}
        </p>
      </div>
    </div>
  );
}
