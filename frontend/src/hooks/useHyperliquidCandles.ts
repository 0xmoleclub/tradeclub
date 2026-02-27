'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const symbolToCoin = (symbol: string): string => {
  const base = symbol.split('-')[0];
  const mapping: Record<string, string> = {
    'BTC': 'BTC', 'ETH': 'ETH', 'SOL': 'SOL', 'APT': 'APT',
    'ARB': 'ARB', 'DOGE': 'DOGE', 'BNB': 'BNB', 'SUI': 'SUI',
    'OP': 'OP', 'XRP': 'XRP', 'HNT': 'HNT', 'INJ': 'INJ',
    'LINK': 'LINK', 'PYTH': 'PYTH', 'TIA': 'TIA', 'JTO': 'JTO',
    'SEI': 'SEI', 'AVAX': 'AVAX', 'W': 'W', 'JUP': 'JUP',
    'WIF': 'WIF', 'BONK': 'BONK', 'KMNO': 'KMNO', 'DRIFT': 'DRIFT',
    'POL': 'POL', 'RENDER': 'RENDER', 'RLB': 'RLB',
  };
  return mapping[base] || base;
};

const intervalToGranularity = (interval: string): string => {
  const map: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d',
  };
  return map[interval] || '15m';
};

const intervalToMs = (interval: string): number => {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return map[interval] || 15 * 60 * 1000;
};

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';
const WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws';

interface UseCandlesReturn {
  candles: Candle[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreData: boolean;
  loadMore: (beforeTime: number) => Promise<void>;
}

export const useHyperliquidCandles = (
  symbol: string, 
  interval: string = '15m'
): UseCandlesReturn => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const isInitialLoadRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Keep ref in sync
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Fetch initial candles
  useEffect(() => {
    const fetchCandles = async () => {
      setIsLoading(true);
      setHasMoreData(true);
      isInitialLoadRef.current = true;
      
      const coin = symbolToCoin(symbol);
      const granularity = intervalToGranularity(interval);
      const intervalMs = intervalToMs(interval);
      
      const endTime = Date.now();
      // Request 200 candles for initial load (more data = better initial view)
      const startTime = endTime - (intervalMs * 200);

      const requestBody = {
        type: 'candleSnapshot',
        req: {
          coin,
          startTime: Math.floor(startTime),
          endTime: Math.floor(endTime),
          interval: granularity
        }
      };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 429) {
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            const delay = Math.pow(2, retryCountRef.current) * 1000;
            console.log(`[Candles] Rate limited, retrying in ${delay}ms...`);
            setTimeout(fetchCandles, delay);
            return;
          }
          console.error('[Candles] Rate limited after retries');
          setIsLoading(false);
          return;
        }

        retryCountRef.current = 0;

        if (!response.ok) {
          const text = await response.text();
          console.error('[Candles] Error:', text);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error('[Candles] Not array:', data);
          setIsLoading(false);
          return;
        }

        const formatted: Candle[] = data.map((c: any) => ({
          time: Math.floor(c.t / 1000),
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
          volume: parseFloat(c.v),
        })).sort((a, b) => a.time - b.time);

        setCandles(formatted);
        isInitialLoadRef.current = false;
      } catch (err) {
        console.error('[Candles] Fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandles();
  }, [symbol, interval]);

  // Load more historical candles (for infinite scroll)
  const loadMore = useCallback(async (beforeTime: number): Promise<void> => {
    if (isLoadingMore || !hasMoreData) return;

    setIsLoadingMore(true);
    
    const coin = symbolToCoin(symbol);
    const granularity = intervalToGranularity(interval);
    const intervalMs = intervalToMs(interval);
    
    // Fetch 100 more candles before the current oldest
    const endTime = beforeTime * 1000; // Convert back to ms
    const startTime = endTime - (intervalMs * 100);

    const requestBody = {
      type: 'candleSnapshot',
      req: {
        coin,
        startTime: Math.floor(startTime),
        endTime: Math.floor(endTime),
        interval: granularity
      }
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error('[Candles] Load more error:', await response.text());
        return;
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        setHasMoreData(false);
        return;
      }

      const newCandles: Candle[] = data.map((c: any) => ({
        time: Math.floor(c.t / 1000),
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
      })).sort((a, b) => a.time - b.time);

      // Merge new candles with existing, avoiding duplicates
      setCandles(prev => {
        const merged = [...newCandles, ...prev];
        const unique = merged.filter((c, idx, arr) => 
          idx === arr.findIndex(t => t.time === c.time)
        );
        return unique.sort((a, b) => a.time - b.time);
      });

      // If we got fewer than 50 candles, probably no more data
      if (newCandles.length < 50) {
        setHasMoreData(false);
      }
    } catch (err) {
      console.error('[Candles] Load more failed:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [symbol, interval, isLoadingMore, hasMoreData]);

  // WebSocket for live updates
  useEffect(() => {
    const coin = symbolToCoin(symbol);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'candle', coin, interval }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.channel === 'candle' && data.data) {
          const c = data.data;
          const newCandle: Candle = {
            time: Math.floor(c.t / 1000),
            open: parseFloat(c.o),
            high: parseFloat(c.h),
            low: parseFloat(c.l),
            close: parseFloat(c.c),
            volume: parseFloat(c.v),
          };

          setCandles(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(c => c.time === newCandle.time);
            
            if (idx >= 0) {
              // Update existing candle
              updated[idx] = newCandle;
            } else {
              // Add new candle, keep sorted
              updated.push(newCandle);
              updated.sort((a, b) => a.time - b.time);
            }
            
            return updated;
          });
        }
      } catch (err) {
        console.error('[Candles] WS error:', err);
      }
    };

    return () => ws.close();
  }, [symbol, interval]);

  return { 
    candles, 
    isLoading, 
    isLoadingMore, 
    hasMoreData,
    loadMore 
  };
};
