'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

export interface OpenOrder {
  coin: string;
  limitPx: string;
  sz: string;
  side: 'A' | 'B';
  timestamp: number;
  oid: number;
  reduceOnly?: boolean;
  triggerPx?: string;
  isTrigger?: boolean;
  tpsl?: 'tp' | 'sl';
}

interface UseOrdersReturn {
  orders: OpenOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidOrders = (): UseOrdersReturn => {
  const { address } = useAccount();
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchOrders = useCallback(async () => {
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
        type: 'openOrders',
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
          console.log(`[useHyperliquidOrders] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchOrders, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[useHyperliquidOrders] API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrders(data || []);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidOrders] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOrders();
    
    const interval = setInterval(fetchOrders, 15000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
  };
};
