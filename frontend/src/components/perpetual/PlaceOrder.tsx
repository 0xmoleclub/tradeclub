"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface PlaceOrderProps {
  symbol?: string;
}

type OrderType = "limit" | "market" | "stop";
type OrderSide = "long" | "short";

// PLACEHOLDER: Simplified PlaceOrder component
// Wallet connection and trading logic to be implemented by assigned developer

export const PlaceOrder = ({ symbol = "BTC-PERP" }: PlaceOrderProps) => {
  const coin = symbol.split("-")[0];

  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<OrderSide>("long");
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(10);
  const [markPrice, setMarkPrice] = useState<number>(0);

  // Fetch mark price
  useEffect(() => {
    const fetchMarkPrice = async () => {
      try {
        const response = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        });
        const data = await response.json();
        const price = data[coin];
        if (price) {
          const priceValue = parseFloat(price);
          setMarkPrice(priceValue);
          if (!price) {
            setPrice(priceValue.toFixed(2));
          }
        }
      } catch (err) {
        console.error("[PlaceOrder] Failed to fetch price:", err);
      }
    };

    fetchMarkPrice();
    const interval = setInterval(fetchMarkPrice, 5000);
    return () => clearInterval(interval);
  }, [coin, price]);

  // TODO: Implement actual wallet connection
  const handleConnect = () => {
    console.log("[PlaceOrder] Connect wallet - TODO: Implement");
    alert("Wallet connection coming soon!");
  };

  // TODO: Implement actual order placement
  const handlePlaceOrder = () => {
    console.log("[PlaceOrder] Place order - TODO: Implement", {
      coin,
      side,
      orderType,
      price,
      size,
      leverage,
    });
    alert("Order placement coming soon!");
  };

  const orderValue = parseFloat(size || "0") * (orderType === "market" ? markPrice : parseFloat(price || "0"));
  const marginRequired = orderValue / leverage;

  return (
    <div className="h-full flex flex-col bg-[#080808] relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Order Type Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-black rounded-lg border border-white/10">
          {(["limit", "market", "stop"] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-all ${
                orderType === type
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Side Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSide("long")}
            className={`flex-1 py-3 rounded font-black uppercase text-xs tracking-wider transition-all ${
              side === "long"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Long
          </button>
          <button
            onClick={() => setSide("short")}
            className={`flex-1 py-3 rounded font-black uppercase text-xs tracking-wider transition-all ${
              side === "short"
                ? "bg-magenta-500/20 text-magenta-400 border border-magenta-500/50"
                : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Short
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 flex-1 overflow-auto">
          {/* Price Input */}
          {orderType !== "market" && (
            <div>
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
                <span>{orderType === "stop" ? "Trigger Price (USD)" : "Price (USD)"}</span>
                <span className="text-cyan-400 cursor-pointer" onClick={() => setPrice(markPrice.toFixed(2))}>
                  Mark: {markPrice.toFixed(2)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</div>
              </div>
            </div>
          )}

          {/* Size Input */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
              <span>Size ({coin})</span>
              <div className="flex gap-2">
                {["25%", "50%", "75%", "100%"].map((pct) => (
                  <span
                    key={pct}
                    className="cursor-pointer hover:text-white transition-colors"
                  >
                    {pct}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-magenta-500 focus:outline-none transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{coin}</div>
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
              <span>Leverage</span>
              <span className="text-yellow-500">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            <div className="flex justify-between text-[8px] font-mono text-gray-600 mt-1">
              <span>1x</span>
              <span>10x</span>
              <span>25x</span>
              <span>50x</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Order Value</span>
              <span className="text-white">{orderValue.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Margin Required</span>
              <span className="text-white">{marginRequired.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Place Order Button - Connect placeholder */}
        <button
          onClick={handleConnect}
          className={`mt-4 w-full py-4 rounded font-black uppercase tracking-[0.15em] text-sm transition-all ${
            side === "long"
              ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              : "bg-gradient-to-r from-magenta-600 to-magenta-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
          } active:scale-[0.98]`}
        >
          <Wallet className="w-5 h-5 inline mr-2" />
          Connect Wallet to Trade
        </button>
      </div>
    </div>
  );
};
