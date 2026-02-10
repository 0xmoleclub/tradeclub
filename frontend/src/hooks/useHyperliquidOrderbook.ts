"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  lastPrice: number | null;
  markPrice: number | null;
}

const symbolToCoin = (symbol: string): string => {
  return symbol.split('-')[0];
};

export function useHyperliquidOrderbook(symbol: string = 'BTC-PERP') {
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markPrice, setMarkPrice] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial orderbook via REST
  const fetchOrderbook = useCallback(async () => {
    try {
      const coin = symbolToCoin(symbol);
      
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'l2Book',
          coin: coin,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.levels) {
        throw new Error('Invalid orderbook data');
      }

      // Process orderbook data
      const rawAsks = data.levels[1] || [];
      const rawBids = data.levels[0] || [];

      // Calculate cumulative totals
      let askTotal = 0;
      const asks: OrderBookLevel[] = rawAsks.map((level: any) => {
        const price = parseFloat(level.px);
        const size = parseFloat(level.sz);
        askTotal += size;
        return { price, size, total: askTotal };
      });

      let bidTotal = 0;
      const bids: OrderBookLevel[] = rawBids.map((level: any) => {
        const price = parseFloat(level.px);
        const size = parseFloat(level.sz);
        bidTotal += size;
        return { price, size, total: bidTotal };
      });

      const bestAsk = asks[0]?.price || 0;
      const bestBid = bids[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestAsk + bestBid) / 2;

      setOrderbook({
        bids,
        asks,
        spread,
        spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
        lastPrice: midPrice,
        markPrice: midPrice,
      });

      setMarkPrice(midPrice);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[OrderBook] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
      setLoading(false);
    }
  }, [symbol]);

  // WebSocket connection for live updates
  useEffect(() => {
    const coin = symbolToCoin(symbol);
    
    const connectWebSocket = () => {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[OrderBook] WebSocket connected');
        // Subscribe to orderbook updates
        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: {
            type: 'l2Book',
            coin: coin,
          }
        }));
        // Also subscribe to trades for last price
        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: {
            type: 'trades',
            coin: coin,
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.channel === 'l2Book' && data.data) {
            const bookData = data.data;
            const rawAsks = bookData.levels?.[1] || [];
            const rawBids = bookData.levels?.[0] || [];

            let askTotal = 0;
            const asks: OrderBookLevel[] = rawAsks.map((level: any) => {
              const price = parseFloat(level.px);
              const size = parseFloat(level.sz);
              askTotal += size;
              return { price, size, total: askTotal };
            });

            let bidTotal = 0;
            const bids: OrderBookLevel[] = rawBids.map((level: any) => {
              const price = parseFloat(level.px);
              const size = parseFloat(level.sz);
              bidTotal += size;
              return { price, size, total: bidTotal };
            });

            const bestAsk = asks[0]?.price || 0;
            const bestBid = bids[0]?.price || 0;
            const spread = bestAsk - bestBid;
            const midPrice = (bestAsk + bestBid) / 2;

            setOrderbook(prev => ({
              bids,
              asks,
              spread,
              spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
              lastPrice: prev?.lastPrice || midPrice,
              markPrice: midPrice,
            }));

            setMarkPrice(midPrice);
          }

          if (data.channel === 'trades' && data.data) {
            const trades = Array.isArray(data.data) ? data.data : [data.data];
            if (trades.length > 0) {
              const lastTrade = trades[trades.length - 1];
              const lastPrice = parseFloat(lastTrade.px);
              setOrderbook(prev => prev ? { ...prev, lastPrice } : prev);
            }
          }
        } catch (err) {
          console.error('[OrderBook] WS parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[OrderBook] WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('[OrderBook] WebSocket closed, reconnecting...');
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };
    };

    // Initial fetch
    fetchOrderbook();

    // Connect WebSocket
    connectWebSocket();

    // Poll for updates every 5 seconds as backup
    const pollInterval = setInterval(fetchOrderbook, 5000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, fetchOrderbook]);

  return {
    orderbook,
    loading,
    error,
    markPrice,
  };
}
