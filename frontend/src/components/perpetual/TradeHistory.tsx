'use client';

import React, { useState, useEffect, useRef } from "react";

interface TradeHistoryProps {
  symbol?: string;
}

interface Trade {
  price: number;
  size: number;
  side: "buy" | "sell";
  time: number;
  hash: string;
}

const symbolToCoin = (symbol: string): string => {
  return symbol.split('-')[0];
};

export const TradeHistory = ({ symbol = "BTC-PERP" }: TradeHistoryProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const coin = symbolToCoin(symbol);

  useEffect(() => {
    setMounted(true);
    
    // Connect to WebSocket for real-time trades
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TradeHistory] WebSocket connected');
        // Subscribe to trades
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
          
          if (data.channel === 'trades' && data.data) {
            const rawTrades = Array.isArray(data.data) ? data.data : [data.data];
            
            const newTrades: Trade[] = rawTrades.map((t: any) => ({
              price: parseFloat(t.px),
              size: parseFloat(t.sz),
              side: t.side === 'B' ? 'buy' : 'sell',
              time: t.time,
              hash: t.hash,
            }));

            setTrades(prev => {
              // Combine new trades with existing, remove duplicates by hash
              const combined = [...newTrades, ...prev];
              const unique = combined.filter((t, i, arr) => 
                arr.findIndex(t2 => t2.hash === t.hash) === i
              );
              // Keep only last 50 trades
              return unique.slice(0, 50);
            });
          }
        } catch (err) {
          console.error('[TradeHistory] WS parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[TradeHistory] WebSocket error:', err);
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [coin]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatSize = (size: number) => {
    if (size >= 1000) return size.toFixed(2);
    if (size >= 1) return size.toFixed(4);
    return size.toFixed(6);
  };

  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Trades</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Trades</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-gray-500">Live</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-[10px] font-mono">
          <thead className="text-gray-500 sticky top-0 bg-[#0a0a0a]">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-600">
                  Waiting for trades...
                </td>
              </tr>
            ) : (
              trades.map((trade, idx) => (
                <tr key={trade.hash || idx} className="hover:bg-white/5 border-b border-white/[0.02]">
                  <td className="px-4 py-1.5 text-gray-500">
                    {formatTime(trade.time)}
                  </td>
                  <td className={`px-4 py-1.5 ${trade.side === 'buy' ? 'text-cyan-400' : 'text-magenta-400'}`}>
                    {formatPrice(trade.price)}
                  </td>
                  <td className="px-4 py-1.5 text-right text-gray-300">
                    {formatSize(trade.size)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
