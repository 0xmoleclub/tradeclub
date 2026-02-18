"use client";

import React, { useState, useEffect } from "react";
import { useHyperliquidOrderbook } from "@/hooks/useHyperliquidOrderbook";
import { Loader2, AlertCircle, WifiOff } from "lucide-react";

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
        className={`absolute top-0 ${type === "ask" ? "left-0" : "right-0"} h-full transition-all duration-300 opacity-20 ${
          type === "ask" ? "bg-fuchsia-500" : "bg-cyan-500"
        }`}
        style={{ width: `${Math.min(width, 100)}%` }}
      />
      <span
        className={`relative z-10 w-1/3 text-left pl-2 ${
          type === "ask" ? "text-fuchsia-400" : "text-cyan-400"
        }`}
      >
        {price.toFixed(price < 10 ? 4 : 2)}
      </span>
      <span className="relative z-10 w-1/3 text-right text-gray-400">
        {size > 1000 ? size.toFixed(2) : size.toFixed(4)}
      </span>
      <span className="relative z-10 w-1/3 text-right pr-2 text-gray-500">
        {total > 1000 ? total.toFixed(2) : total.toFixed(4)}
      </span>
    </div>
  );
};

interface OrderBookProps {
  symbol?: string;
}

export const OrderBook = ({ symbol = "BTC-PERP" }: OrderBookProps) => {
  const { orderbook, loading, error } = useHyperliquidOrderbook(symbol);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state
  if (!mounted || (loading && !orderbook)) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
        <span className="text-[10px] text-gray-500 mt-2">Loading orderbook...</span>
      </div>
    );
  }

  // Show error state but still try to display data if we have it
  if (error && !orderbook) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center">
        <WifiOff className="w-8 h-8 text-red-400 mb-2" />
        <span className="text-[10px] text-red-400">{error}</span>
        <span className="text-[9px] text-gray-600 mt-1">Retrying...</span>
      </div>
    );
  }

  // No data at all
  if (!orderbook) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <AlertCircle className="w-8 h-8 text-gray-600 mb-2" />
        <span className="text-[10px] text-gray-500">No orderbook data</span>
      </div>
    );
  }

  const asks = orderbook?.asks || [];
  const bids = orderbook?.bids || [];

  // Calculate max total for depth visualization
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1]?.total || 0 : 0;
  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1]?.total || 0 : 0;
  const maxTotal = Math.max(maxAskTotal, maxBidTotal, 1);

  // Mid price display
  const midPrice = orderbook?.lastPrice ||
    (asks[0] && bids[0] ? (asks[0].price + bids[0].price) / 2 : 0);

  const formatPrice = (price: number) => {
    if (!price) return "-";
    if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return price.toFixed(6);
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
        <div className="flex-1 flex flex-col justify-end overflow-hidden min-h-0">
          {asks.slice(-15).reverse().map((ask, i) => (
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
        <div className="flex flex-col items-center py-2 bg-white/5 border-y border-white/10 shrink-0">
          <div className="font-mono font-bold text-white text-sm">
            {formatPrice(midPrice)}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>Mark</span>
            {orderbook?.spreadPercent !== undefined && (
              <span className="text-gray-500">
                Spread: {orderbook.spread.toFixed(orderbook.spread < 1 ? 4 : 2)} ({orderbook.spreadPercent.toFixed(4)}%)
              </span>
            )}
          </div>
        </div>

        {/* Bids (buys) */}
        <div className="flex-1 overflow-hidden min-h-0">
          {bids.slice(0, 15).map((bid, i) => (
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
      <div className="px-2 py-1.5 border-t border-white/10 text-[9px] text-gray-500 flex justify-between shrink-0">
        <span>Hyperliquid</span>
        <span className={loading ? "text-cyan-500" : error ? "text-red-500" : "text-green-500"}>
          {loading ? "Syncing..." : error ? "REST Mode" : "Live"}
        </span>
      </div>
    </div>
  );
};
