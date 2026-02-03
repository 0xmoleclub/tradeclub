"use client";

import React, { useState, useEffect } from "react";
import { useDriftOrderbook } from "@/hooks/useDriftOrderbook";

interface RowProps {
  price: number;
  size: number;
  total: number;
  type: "ask" | "bid";
  maxTotal: number;
}

const Row = ({ price, size, total, type, maxTotal }: RowProps) => {
  const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  return (
    <div className="flex justify-between text-[10px] font-mono py-0.5 relative group hover:bg-white/5 cursor-pointer">
      <div 
        className={`absolute top-0 right-0 h-full transition-all duration-300 ${
          type === "ask" ? "bg-fuchsia-500/10" : "bg-cyan-500/10"
        }`} 
        style={{ width: `${Math.min(width, 100)}%` }} 
      />
      <span className={`relative z-10 w-1/3 text-left pl-2 ${type === "ask" ? "text-fuchsia-400" : "text-cyan-400"}`}>
        {price.toFixed(2)}
      </span>
      <span className="relative z-10 w-1/3 text-right text-gray-400">{size.toFixed(3)}</span>
      <span className="relative z-10 w-1/3 text-right pr-2 text-gray-500">{total.toFixed(3)}</span>
    </div>
  );
};

interface OrderBookProps {
  symbol?: string;
}

export const OrderBook = ({ symbol = "SOL-PERP" }: OrderBookProps) => {
  const { orderbook, loading, error } = useDriftOrderbook(symbol);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loading && !orderbook) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-[10px] text-gray-500">Loading orderbook...</span>
      </div>
    );
  }

  if (error && !orderbook) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <span className="text-[10px] text-red-400 text-center">{error}</span>
      </div>
    );
  }

  const asks = orderbook?.asks || [];
  const bids = orderbook?.bids || [];
  
  // Calculate max total for depth visualization
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 0;
  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 0;
  const maxTotal = Math.max(maxAskTotal, maxBidTotal);

  // Mid price display
  const midPrice = orderbook?.lastPrice || 
    (asks[0] && bids[0] ? (asks[0].price + bids[0].price) / 2 : 0);

  const formatPrice = (price: number) => {
    if (symbol?.includes('BTC')) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (symbol?.includes('ETH')) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between px-2 py-2 border-b border-white/10 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      
      {/* Orderbook */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Asks (sells) - reversed so highest ask is at top */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
          {asks.slice().reverse().map((ask, i) => (
            <Row 
              key={`ask-${i}`} 
              price={ask.price} 
              size={ask.size} 
              total={ask.total} 
              type="ask" 
              maxTotal={maxTotal}
            />
          ))}
        </div>
        
        {/* Spread / Mid Price */}
        <div className="flex flex-col items-center py-2 bg-white/5 border-y border-white/10">
          <div className="font-mono font-bold text-white text-sm">
            {formatPrice(midPrice)}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>Mark</span>
            {orderbook?.spreadPercent !== undefined && (
              <span className="text-gray-500">
                Spread: {orderbook.spread.toFixed(2)} ({orderbook.spreadPercent.toFixed(4)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Bids (buys) */}
        <div className="flex-1 overflow-hidden">
          {bids.map((bid, i) => (
            <Row 
              key={`bid-${i}`} 
              price={bid.price} 
              size={bid.size} 
              total={bid.total} 
              type="bid" 
              maxTotal={maxTotal}
            />
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-white/10 text-[9px] text-gray-500 flex justify-between">
        <span>Drift Devnet</span>
        <span className={loading ? "text-cyan-500" : "text-green-500"}>
          {loading ? "Updating..." : "Live"}
        </span>
      </div>
    </div>
  );
};
