'use client';

import React, { useState, useEffect } from "react";

interface TradeHistoryProps {
  symbol?: string;
}

interface Trade {
  price: number;
  size: number;
  time: string;
  side: "buy" | "sell";
  id: number;
}

// Generate deterministic mock trades based on symbol
const generateTrades = (symbol: string): Trade[] => {
  const basePrice = symbol.includes("BTC") ? 98420 : 
                   symbol.includes("ETH") ? 3450 :
                   symbol.includes("SOL") ? 185 : 100;
  
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return Array.from({ length: 20 }, (_, i) => {
    const pseudoRandom = Math.sin(seed + i) * 0.5 + 0.5; // Deterministic pseudo-random
    const now = new Date();
    now.setSeconds(now.getSeconds() - i * 30);
    
    return {
      price: basePrice + (pseudoRandom - 0.5) * 50,
      size: pseudoRandom * 0.5,
      time: now.toLocaleTimeString(),
      side: pseudoRandom > 0.5 ? "buy" : "sell",
      id: i,
    };
  });
};

export const TradeHistory = ({ symbol = "BTC-PERP" }: TradeHistoryProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrades(generateTrades(symbol));
    
    // Update times periodically
    const interval = setInterval(() => {
      setTrades(generateTrades(symbol));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Fills</span>
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
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Fills</span>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-[10px] font-mono">
          <thead className="text-gray-500 sticky top-0 bg-[#0a0a0a]">
            <tr>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 border-b border-white/[0.02]">
                <td className={`px-4 py-1.5 ${t.side === "buy" ? "text-cyan-400" : "text-magenta-400"}`}>
                  {t.price.toFixed(1)}
                </td>
                <td className="px-4 py-1.5 text-gray-300">{t.size.toFixed(4)}</td>
                <td className="px-4 py-1.5 text-right text-gray-500">{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
