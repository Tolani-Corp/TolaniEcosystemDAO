'use client';

import { useState, useEffect } from 'react';
import { reverseResolveUD, resolveUDomain, getUDRecords, isUDomain } from './unstoppable';

/**
 * Hook to resolve an address to a UD domain name
 */
export function useUDName(address: string | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setName(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    reverseResolveUD(address)
      .then((resolvedName) => {
        if (!cancelled) {
          setName(resolvedName);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setName(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { name, isLoading };
}

/**
 * Hook to resolve a UD domain to an address
 */
export function useUDAddress(domain: string | undefined) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain || !isUDomain(domain)) {
      setAddress(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    resolveUDomain(domain)
      .then((resolvedAddress) => {
        if (!cancelled) {
          setAddress(resolvedAddress);
          setIsLoading(false);
          if (!resolvedAddress) {
            setError('Domain not found or no ETH address set');
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAddress(null);
          setError(err.message || 'Resolution failed');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return { address, isLoading, error };
}

/**
 * Hook to get all records for a UD domain
 */
export function useUDRecords(domain: string | undefined) {
  const [records, setRecords] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!domain || !isUDomain(domain)) {
      setRecords(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getUDRecords(domain)
      .then((resolvedRecords) => {
        if (!cancelled) {
          setRecords(resolvedRecords);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecords(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return { records, isLoading };
}
