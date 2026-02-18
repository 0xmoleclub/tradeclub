'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

// Raw response from API has data in delta object
interface RawFundingPayment {
  delta: {
    coin: string;
    fundingRate: string;
    szi: string;
    type: string;
    usdc: string;
    nSamples: number | null;
  };
  hash: string;
  time: number;
}

// Processed for UI use
export interface FundingPayment {
  coin: string;
  fundingRate: string;
  szi: string;
  usdc: string;
  time: number;
  hash: string;
  side: 'paid' | 'received';
}

interface UseFundingReturn {
  fundingHistory: FundingPayment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  stats: {
    totalPaid: number;
    totalReceived: number;
    netFunding: number;
  };
}

export const useHyperliquidFunding = (): UseFundingReturn => {
  const { address } = useAccount();
  const [fundingHistory, setFundingHistory] = useState<FundingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchFunding = useCallback(async () => {
    if (!address) {
      setFundingHistory([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      // userFunding requires startTime - get last 90 days
      const endTime = Date.now();
      const startTime = endTime - (90 * 24 * 60 * 60 * 1000); // 90 days ago

      const requestBody = {
        type: 'userFunding',
        user: address,
        startTime: startTime,
        endTime: endTime,
      };

      console.log('[useHyperliquidFunding] Request:', JSON.stringify(requestBody));

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
          console.log(`[useHyperliquidFunding] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchFunding, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[useHyperliquidFunding] Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as RawFundingPayment[];
      
      console.log('[useHyperliquidFunding] Response:', data);
      
      // Transform data from {delta: {...}} format to flat format
      const processed = (data || []).map((item: RawFundingPayment) => ({
        coin: item.delta.coin,
        fundingRate: item.delta.fundingRate,
        szi: item.delta.szi,
        usdc: item.delta.usdc,
        time: item.time,
        hash: item.hash,
        side: parseFloat(item.delta.usdc) >= 0 ? 'received' : 'paid' as 'received' | 'paid',
      }));
      
      // Sort by time descending (newest first)
      const sorted = processed.sort((a, b) => b.time - a.time);
      
      setFundingHistory(sorted);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidFunding] Error:', err);
      setFundingHistory([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch funding');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchFunding();
    
    const interval = setInterval(fetchFunding, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFunding]);

  const stats = {
    totalPaid: fundingHistory
      .filter(f => f.side === 'paid')
      .reduce((acc, f) => acc + Math.abs(parseFloat(f.usdc)), 0),
    totalReceived: fundingHistory
      .filter(f => f.side === 'received')
      .reduce((acc, f) => acc + parseFloat(f.usdc), 0),
    netFunding: fundingHistory.reduce((acc, f) => acc + parseFloat(f.usdc), 0),
  };

  return {
    fundingHistory,
    isLoading,
    error,
    refetch: fetchFunding,
    stats,
  };
};

export const useHyperliquidFundingByCoin = (coin: string) => {
  const { fundingHistory, isLoading, error, refetch, stats } = useHyperliquidFunding();
  
  const filtered = coin 
    ? fundingHistory.filter(f => f.coin === coin.split('-')[0])
    : fundingHistory;

  const filteredStats = {
    totalPaid: filtered.filter(f => f.side === 'paid').reduce((acc, f) => acc + Math.abs(parseFloat(f.usdc)), 0),
    totalReceived: filtered.filter(f => f.side === 'received').reduce((acc, f) => acc + parseFloat(f.usdc), 0),
    netFunding: filtered.reduce((acc, f) => acc + parseFloat(f.usdc), 0),
  };

  return {
    fundingHistory: filtered,
    isLoading,
    error,
    refetch,
    stats: filteredStats,
  };
};
