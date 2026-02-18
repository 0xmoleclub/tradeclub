'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

export interface HistoricalOrder {
  order: {
    coin: string;
    side: 'A' | 'B';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    triggerCondition: string;
    isTrigger: boolean;
    triggerPx: string;
    children: any[];
    isPositionTpsl: boolean;
    reduceOnly: boolean;
    orderType: string;
    origSz: string;
    tif: string;
    cloid: string | null;
  };
  status: 'filled' | 'open' | 'canceled' | 'triggered' | 'rejected' | 'marginCanceled';
  statusTimestamp: number;
}

interface UseOrderHistoryReturn {
  orders: HistoricalOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidOrderHistory = (): UseOrderHistoryReturn => {
  const { address } = useAccount();
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchOrderHistory = useCallback(async () => {
    if (!address) {
      setOrders([]);
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
        type: 'historicalOrders',
        user: address,
      };

      console.log('[useHyperliquidOrderHistory] Request:', JSON.stringify(requestBody));

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
          console.log(`[useHyperliquidOrderHistory] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchOrderHistory, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[useHyperliquidOrderHistory] Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Sort by statusTimestamp descending (newest first)
      const sorted = (data || []).sort((a: HistoricalOrder, b: HistoricalOrder) => 
        b.statusTimestamp - a.statusTimestamp
      );
      
      setOrders(sorted);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidOrderHistory] Error:', err);
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch order history');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOrderHistory();
    
    const interval = setInterval(fetchOrderHistory, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOrderHistory]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrderHistory,
  };
};

export const useHyperliquidOrderHistoryByCoin = (coin: string) => {
  const { orders, isLoading, error, refetch } = useHyperliquidOrderHistory();
  
  const filtered = coin 
    ? orders.filter(o => o.order.coin === coin.split('-')[0])
    : orders;

  return {
    orders: filtered,
    isLoading,
    error,
    refetch,
  };
};
