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
      <div className="w-full max-w-md rounded-lg border border-[#E5C64B]/40 bg-gray-950 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#E5C64B]/15">
          <AlertTriangle className="h-7 w-7 text-[#E5C64B]" />
        </div>
        
        <h2 className="mb-2 text-2xl font-bold text-white">Unsupported Network</h2>
        
        <p className="text-gray-400 mb-6">
          You&apos;re connected to <span className="text-white font-medium">{getChainName(chainId)}</span>.
          <br />
          Switch networks to use DAO actions.
        </p>

        <div className="space-y-3">
          {SUPPORTED_CHAIN_IDS.map((id) => (
            <button
              key={id}
              onClick={() => switchChain?.({ chainId: id })}
              className={`w-full rounded-lg px-4 py-3 font-medium transition-all ${
                id === DEFAULT_CHAIN_ID
                  ? 'bg-[#007373] text-white hover:bg-[#008f8f]'
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
