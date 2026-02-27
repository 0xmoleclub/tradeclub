'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

export interface UserFill {
  coin: string;
  px: string;
  sz: string;
  side: 'A' | 'B';
  time: number;
  hash: string;
  oid?: number;
  crossed?: boolean;
  fee: string;
  feeToken: string;
  closedPnl?: string;
}

interface UseFillsReturn {
  fills: UserFill[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidFills = (): UseFillsReturn => {
  const { address } = useAccount();
  const [fills, setFills] = useState<UserFill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchFills = useCallback(async () => {
    if (!address) {
      setFills([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        type: 'userFills',
        user: address,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          console.log(`[useHyperliquidFills] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchFills, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[useHyperliquidFills] API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Sort by time descending (newest first) and limit to 50
      const sortedFills = (data || [])
        .sort((a: UserFill, b: UserFill) => b.time - a.time)
        .slice(0, 50);
      
      setFills(sortedFills);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidFills] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fills');
      setFills([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchFills();
    
    const interval = setInterval(fetchFills, 15000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFills]);

  return {
    fills,
    isLoading,
    error,
    refetch: fetchFills,
  };
};

// Keep for backward compatibility - returns all fills (already limited to 50)
export const useHyperliquidFillsByCoin = (coin: string): UseFillsReturn => {
  const { fills, isLoading, error, refetch } = useHyperliquidFills();
  return { fills, isLoading, error, refetch };
};
