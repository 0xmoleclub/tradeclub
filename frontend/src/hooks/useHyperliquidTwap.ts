'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

export interface TwapSliceFill {
  fill: {
    closedPnl: string;
    coin: string;
    crossed: boolean;
    dir: string;
    hash: string;
    oid: number;
    px: string;
    side: 'A' | 'B';
    startPosition: string;
    sz: string;
    time: number;
    fee: string;
    feeToken: string;
    tid: number;
  };
  twapId: number;
}

// Backward compatibility alias
export type TwapOrder = TwapSliceFill;

interface UseTwapReturn {
  twapFills: TwapSliceFill[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidTwap = (): UseTwapReturn => {
  const { address } = useAccount();
  const [twapFills, setTwapFills] = useState<TwapSliceFill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchTwapFills = useCallback(async () => {
    if (!address) {
      setTwapFills([]);
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
        type: 'userTwapSliceFills',
        user: address,
      };

      console.log('[useHyperliquidTwap] Request:', JSON.stringify(requestBody));

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
          console.log(`[useHyperliquidTwap] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchTwapFills, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[useHyperliquidTwap] Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Sort by fill time descending (newest first)
      const sorted = (data || []).sort((a: TwapSliceFill, b: TwapSliceFill) => 
        b.fill.time - a.fill.time
      );
      
      setTwapFills(sorted);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidTwap] Error:', err);
      setTwapFills([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch TWAP fills');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchTwapFills();
    
    const interval = setInterval(fetchTwapFills, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTwapFills]);

  return {
    twapFills,
    isLoading,
    error,
    refetch: fetchTwapFills,
  };
};

export const useHyperliquidTwapByCoin = (coin: string) => {
  const { twapFills, isLoading, error, refetch } = useHyperliquidTwap();
  
  const filtered = coin 
    ? twapFills.filter(t => t.fill.coin === coin.split('-')[0])
    : twapFills;

  return {
    twapFills: filtered,
    isLoading,
    error,
    refetch,
  };
};
