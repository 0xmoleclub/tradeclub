"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  return symbol.split("-")[0];
};

const API_URL = "https://api.hyperliquid-testnet.xyz/info";
const WS_URL = "wss://api.hyperliquid-testnet.xyz/ws";

export function useHyperliquidOrderbook(symbol: string = "BTC-PERP") {
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markPrice, setMarkPrice] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isActiveRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Fetch initial orderbook via REST
  const fetchOrderbook = useCallback(async () => {
    try {
      const coin = symbolToCoin(symbol);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "l2Book",
          coin: coin,
        }),
      });

      if (response.status === 429) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          console.log(`[OrderBook] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchOrderbook, delay);
          return;
        }
        throw new Error("Rate limited. Please try again later.");
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.levels) {
        throw new Error("Invalid orderbook data");
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
      console.error("[OrderBook] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orderbook");
      setLoading(false);
    }
  }, [symbol]);

  // WebSocket connection for live updates
  useEffect(() => {
    isActiveRef.current = true;
    const coin = symbolToCoin(symbol);

    const connectWebSocket = () => {
      // Don't attempt reconnection if component unmounted
      if (!isActiveRef.current) return;

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Max reconnection attempts
      if (reconnectAttemptsRef.current > 5) {
        console.log("[OrderBook] Max reconnection attempts reached, using REST only");
        return;
      }

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[OrderBook] WebSocket connected");
          reconnectAttemptsRef.current = 0;

          // Subscribe to orderbook updates
          ws.send(
            JSON.stringify({
              method: "subscribe",
              subscription: {
                type: "l2Book",
                coin: coin,
              },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.channel === "l2Book" && data.data) {
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

              setOrderbook((prev) => ({
                bids,
                asks,
                spread,
                spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
                lastPrice: prev?.lastPrice || midPrice,
                markPrice: midPrice,
              }));

              setMarkPrice(midPrice);
            }
          } catch (err) {
            console.error("[OrderBook] WS parse error:", err);
          }
        };

        ws.onerror = (err) => {
          console.error("[OrderBook] WebSocket error:", err);
        };

        ws.onclose = () => {
          if (!isActiveRef.current) return;

          console.log("[OrderBook] WebSocket closed");
          reconnectAttemptsRef.current++;

          // Exponential backoff
          const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isActiveRef.current) {
              console.log(`[OrderBook] Reconnecting... attempt ${reconnectAttemptsRef.current}`);
              connectWebSocket();
            }
          }, delay);
        };
      } catch (err) {
        console.error("[OrderBook] Failed to create WebSocket:", err);
      }
    };

    // Initial fetch
    fetchOrderbook();

    // Connect WebSocket
    connectWebSocket();

    // Poll for updates every 10 seconds as backup
    const pollInterval = setInterval(fetchOrderbook, 10000);

    return () => {
      isActiveRef.current = false;
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
