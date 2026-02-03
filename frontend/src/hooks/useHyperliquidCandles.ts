'use client';

import { useState, useEffect, useRef } from 'react';

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

const API_URL = 'https://api.hyperliquid.xyz/info';

export const useHyperliquidCandles = (symbol: string, interval: string = '15m') => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch historical candles
  useEffect(() => {
    const fetchCandles = async () => {
      const coin = symbolToCoin(symbol);
      const granularity = intervalToGranularity(interval);
      
      // Get ~48 candles of history based on interval
      const endTime = Date.now();
      const intervalMs = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
      }[interval] || 15 * 60 * 1000;
      
      // Request 50 candles worth of data
      const startTime = endTime - (intervalMs * 50);

      // Hyperliquid API format - use 'interval' not 'granularity'
      const requestBody = {
        type: 'candleSnapshot',
        req: {
          coin: coin,
          startTime: Math.floor(startTime),
          endTime: Math.floor(endTime),
          interval: granularity  // API expects 'interval', not 'granularity'
        }
      };

      console.log('[Candles] Request:', requestBody);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const text = await response.text();
        console.log('[Candles] Status:', response.status);

        if (!response.ok) {
          console.error('[Candles] Error:', text);
          return;
        }

        const data = JSON.parse(text);
        
        if (!Array.isArray(data)) {
          console.error('[Candles] Not array:', data);
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

        console.log('[Candles] Got', formatted.length, 'candles');
        setCandles(formatted.slice(-48));
      } catch (err) {
        console.error('[Candles] Fetch failed:', err);
      }
    };

    fetchCandles();
  }, [symbol, interval]);

  // WebSocket for live updates
  useEffect(() => {
    const coin = symbolToCoin(symbol);
    const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
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
            
            if (idx >= 0) updated[idx] = newCandle;
            else updated.push(newCandle);
            
            return updated.sort((a, b) => a.time - b.time).slice(-48);
          });
        }
      } catch (err) {
        console.error('[Candles] WS error:', err);
      }
    };

    return () => ws.close();
  }, [symbol, interval]);

  return { candles };
};
