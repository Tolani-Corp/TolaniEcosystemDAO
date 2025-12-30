'use client';

import { useUDName } from '@/lib/hooks';
import { formatAddress } from '@/lib/utils';
import { Globe, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface AddressDisplayProps {
  address: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AddressDisplay({
  address,
  showCopy = false,
  showExplorer = false,
  className = '',
  size = 'md',
}: AddressDisplayProps) {
  const { name: udName, isLoading } = useUDName(address);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (isLoading) {
    return (
      <span className={`${sizeClasses[size]} text-gray-400 animate-pulse ${className}`}>
        Loading...
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {udName && <Globe className={`${iconSizes[size]} text-violet-400`} />}
      <span className={`${sizeClasses[size]} font-medium`}>
        {udName || formatAddress(address)}
      </span>
      {udName && (
        <span className={`${sizeClasses[size]} text-gray-500`}>
          ({formatAddress(address)})
        </span>
      )}
      {showCopy && (
        <button
          onClick={copyAddress}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className={`${iconSizes[size]} text-green-400`} />
          ) : (
            <Copy className={`${iconSizes[size]} text-gray-400 hover:text-white`} />
          )}
        </button>
      )}
      {showExplorer && (
        <a
          href={`https://sepolia.etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="View on Etherscan"
        >
          <ExternalLink className={`${iconSizes[size]} text-gray-400 hover:text-white`} />
        </a>
      )}
    </span>
  );
}

/**
 * Simple inline address with UD resolution
 */
export function Address({ address, className = '' }: { address: string; className?: string }) {
  const { name: udName } = useUDName(address);
  
  return (
    <span className={`font-mono ${className}`}>
      {udName ? (
        <span className="text-violet-400">{udName}</span>
      ) : (
        formatAddress(address)
      )}
    </span>
  );
}
