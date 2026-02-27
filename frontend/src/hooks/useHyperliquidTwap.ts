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

export interface ActiveTwapOrder {
  twapId: number;
  time: number;
  state: {
    coin: string;
    executedNtl: string;
    executedSz: string;
    minutes: number;
    randomize: boolean;
    side: 'A' | 'B';
    sz: string;
    timestamp: number;
  };
  status: {
    status: 'activated' | 'finished' | 'terminated' | 'error';
  };
}

// Backward compatibility alias
export type TwapOrder = TwapSliceFill;

interface UseTwapReturn {
  twapFills: TwapSliceFill[];
  activeTwaps: ActiveTwapOrder[];
  historicalTwaps: ActiveTwapOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidTwap = (): UseTwapReturn => {
  const { address } = useAccount();
  const [twapFills, setTwapFills] = useState<TwapSliceFill[]>([]);
  const [activeTwaps, setActiveTwaps] = useState<ActiveTwapOrder[]>([]);
  const [historicalTwaps, setHistoricalTwaps] = useState<ActiveTwapOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchTwap = useCallback(async () => {
    if (!address) {
      console.log('[useHyperliquidTwap] No user address, skipping fetch');
      setTwapFills([]);
      setActiveTwaps([]);
      setHistoricalTwaps([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useHyperliquidTwap] Fetching TWAP data for:', address);

      // Fetch both fills and history in parallel
      const [fillsResponse, historyResponse] = await Promise.all([
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            type: 'userTwapSliceFills',
            user: address,
          }),
        }),
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            type: 'twapHistory',
            user: address,
          }),
        }),
      ]);

      if (fillsResponse.status === 429 || historyResponse.status === 429) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          console.log(`[useHyperliquidTwap] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchTwap, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!fillsResponse.ok || !historyResponse.ok) {
        throw new Error(`HTTP error! fills: ${fillsResponse.status}, history: ${historyResponse.status}`);
      }

      const fillsData = await fillsResponse.json();
      const historyData = await historyResponse.json();
      
      console.log('[useHyperliquidTwap] Fills:', (fillsData || []).length, 'History:', (historyData || []).length);
      
      // Debug: Log all unique status values
      const allStatuses = (historyData || []).map((t: ActiveTwapOrder) => t.status?.status);
      const uniqueStatuses = [...new Set(allStatuses)];
      console.log('[useHyperliquidTwap] All TWAP statuses found:', uniqueStatuses);
      
      // Sort fills by time descending (newest first)
      const sortedFills = (fillsData || []).sort((a: TwapSliceFill, b: TwapSliceFill) => 
        b.fill.time - a.fill.time
      );
      
      // Deduplicate TWAP history by twapId, keeping only the most recent record for each
      const twapMap = new Map<number, ActiveTwapOrder>();
      (historyData || []).forEach((twap: ActiveTwapOrder) => {
        const existing = twapMap.get(twap.twapId);
        if (!existing || twap.time > existing.time) {
          twapMap.set(twap.twapId, twap);
        }
      });
      
      const uniqueTwaps = Array.from(twapMap.values());
      console.log('[useHyperliquidTwap] Total records:', (historyData || []).length, 'Unique TWAPs:', uniqueTwaps.length);
      
      // Log sample deduplicated records
      if (uniqueTwaps.length > 0) {
        console.log('[useHyperliquidTwap] Sample unique TWAPs:', 
          uniqueTwaps.slice(0, 5).map((t: ActiveTwapOrder) => ({
            twapId: t.twapId,
            status: t.status?.status,
            coin: t.state?.coin,
            executed: t.state?.executedSz,
            total: t.state?.sz,
            time: new Date(t.time * 1000).toISOString()
          }))
        );
      }
      
      // Filter for active TWAP orders (status: 'activated')
      const active = uniqueTwaps
        .filter((twap: ActiveTwapOrder) => twap.status?.status === 'activated')
        .sort((a: ActiveTwapOrder, b: ActiveTwapOrder) => b.time - a.time);
      
      // Filter for historical TWAP orders (status: 'finished', 'terminated', 'error')
      const historical = uniqueTwaps
        .filter((twap: ActiveTwapOrder) => 
          twap.status?.status === 'finished' || 
          twap.status?.status === 'terminated' || 
          twap.status?.status === 'error'
        )
        .sort((a: ActiveTwapOrder, b: ActiveTwapOrder) => b.time - a.time);
      
      console.log('[useHyperliquidTwap] Active:', active.length, 'Historical:', historical.length);
      
      setTwapFills(sortedFills);
      setActiveTwaps(active);
      setHistoricalTwaps(historical);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidTwap] Error:', err);
      setTwapFills([]);
      setActiveTwaps([]);
      setHistoricalTwaps([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch TWAP data');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchTwap();
    
    const interval = setInterval(fetchTwap, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTwap]);

  return {
    twapFills,
    activeTwaps,
    historicalTwaps,
    isLoading,
    error,
    refetch: fetchTwap,
  };
};

export const useHyperliquidTwapByCoin = (coin: string) => {
  const { twapFills, activeTwaps, historicalTwaps, isLoading, error, refetch } = useHyperliquidTwap();
  
  const coinName = coin.split('-')[0];
  const filteredFills = coin 
    ? twapFills.filter(t => t.fill.coin === coinName)
    : twapFills;
    
  const filteredActive = coin
    ? activeTwaps.filter(t => t.state.coin === coinName)
    : activeTwaps;
    
  const filteredHistorical = coin
    ? historicalTwaps.filter(t => t.state.coin === coinName)
    : historicalTwaps;

  return {
    twapFills: filteredFills,
    activeTwaps: filteredActive,
    historicalTwaps: filteredHistorical,
    isLoading,
    error,
    refetch,
  };
};
