"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { tradingApi, authApi, agentWalletApi } from "@/services/trading";
import { useHyperliquidAccount } from "@/hooks/useHyperliquidAccount";

interface PlaceOrderProps {
  symbol?: string;
}

type OrderType = "limit" | "market" | "stop";
type OrderSide = "long" | "short";
type TabType = "open" | "close" | "tpsl";

interface OrderStatus {
  type: "loading" | "success" | "error";
  message: string;
}

export const PlaceOrder = ({ symbol = "BTC-PERP" }: PlaceOrderProps) => {
  const coin = symbol.split("-")[0];
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { account, positions, refetch: refetchAccount } = useHyperliquidAccount();

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state
  const [activeTab, setActiveTab] = useState<TabType>("open");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<OrderSide>("long");
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(10);
  const [markPrice, setMarkPrice] = useState<number>(0);
  
  // TP/SL state
  const [tpPrice, setTpPrice] = useState<string>("");
  const [slPrice, setSlPrice] = useState<string>("");
  
  // Auth state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAgentWallet, setHasAgentWallet] = useState(false);
  
  // Order status
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    setIsAuthenticated(authApi.isAuthenticated());
  }, []);

  // Fetch mark price
  useEffect(() => {
    const fetchMarkPrice = async () => {
      try {
        const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        });
        const data = await response.json();
        if (!data) return;
        const markPriceValue = data[coin];
        if (markPriceValue) {
          setMarkPrice(parseFloat(markPriceValue));
        }
      } catch (err) {
        console.error("[PlaceOrder] Failed to fetch price:", err);
      }
    };

    fetchMarkPrice();
    const interval = setInterval(fetchMarkPrice, 5000);
    return () => clearInterval(interval);
  }, [coin]);

  // Check if user has position for this coin
  const position = positions.find(p => p.coin === coin);
  const positionSize = position ? Math.abs(parseFloat(position.szi)) : 0;
  const positionSide = position ? (parseFloat(position.szi) > 0 ? 'long' : 'short') : null;

  // Authentication flow
  const handleAuthenticate = async () => {
    if (!address || !signMessageAsync) return;
    
    setIsAuthenticating(true);
    setOrderStatus({ type: "loading", message: "Authenticating..." });
    
    try {
      // 1. Get nonce
      const { nonce, message } = await authApi.getNonce(address);
      
      // 2. Sign message
      const signature = await signMessageAsync({ message });
      
      // 3. Login
      await authApi.login(address, signature);
      setIsAuthenticated(true);
      
      // 4. Check/create agent wallet
      await ensureAgentWallet();
      
      setOrderStatus({ type: "success", message: "Authenticated!" });
      setTimeout(() => setOrderStatus(null), 2000);
    } catch (err: any) {
      console.error("[PlaceOrder] Auth failed:", err);
      setOrderStatus({ type: "error", message: err.message || "Authentication failed" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Ensure agent wallet exists
  const ensureAgentWallet = async () => {
    try {
      let wallet = await agentWalletApi.get();
      if (!wallet) {
        setOrderStatus({ type: "loading", message: "Creating agent wallet..." });
        wallet = await agentWalletApi.create();
      }
      setHasAgentWallet(!!wallet);
      return wallet;
    } catch (err: any) {
      console.error("[PlaceOrder] Agent wallet error:", err);
      throw err;
    }
  };

  // Place order handler
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      await handleAuthenticate();
      return;
    }

    if (!size || parseFloat(size) <= 0) {
      setOrderStatus({ type: "error", message: "Enter valid size" });
      return;
    }

    setIsSubmitting(true);
    setOrderStatus({ type: "loading", message: "Placing order..." });

    try {
      let response;
      const isBuy = side === "long";

      if (activeTab === "open") {
        // Open position
        if (orderType === "market") {
          response = await tradingApi.openMarketOrder({
            coin,
            isBuy,
            size,
          });
        } else {
          // Limit order
          if (!price || parseFloat(price) <= 0) {
            setOrderStatus({ type: "error", message: "Enter valid price" });
            setIsSubmitting(false);
            return;
          }
          response = await tradingApi.openLimitOrder({
            coin,
            isBuy,
            price,
            size,
          });
        }
      } else if (activeTab === "close") {
        // Close position
        if (!position || positionSize <= 0) {
          setOrderStatus({ type: "error", message: "No position to close" });
          setIsSubmitting(false);
          return;
        }
        
        if (orderType === "market") {
          response = await tradingApi.closeMarketOrder({
            coin,
            size,
          });
        } else {
          if (!price || parseFloat(price) <= 0) {
            setOrderStatus({ type: "error", message: "Enter valid price" });
            setIsSubmitting(false);
            return;
          }
          response = await tradingApi.closeLimitOrder({
            coin,
            price,
            size,
          });
        }
      } else if (activeTab === "tpsl") {
        // TP/SL orders
        const positionIsBuy = positionSide === "long";
        
        if (tpPrice && tpPrice !== "0") {
          response = await tradingApi.placeTakeProfit({
            coin,
            isBuy: positionIsBuy,
            size,
            takeProfitPrice: tpPrice,
            takeProfitTrigger: tpPrice, // Use same for now
          });
        }
        
        if (slPrice && slPrice !== "0") {
          response = await tradingApi.placeStopLoss({
            coin,
            isBuy: positionIsBuy,
            size,
            stopLossPrice: slPrice,
            stopLossTrigger: slPrice, // Use same for now
          });
        }
      }

      if (response?.success) {
        setOrderStatus({ type: "success", message: response.message || "Order placed!" });
        setSize("");
        setPrice("");
        refetchAccount(); // Refresh positions
        setTimeout(() => setOrderStatus(null), 3000);
      }
    } catch (err: any) {
      console.error("[PlaceOrder] Order failed:", err);
      setOrderStatus({ type: "error", message: err.message || "Order failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate order value
  const orderPrice = orderType === "market" ? markPrice : parseFloat(price || "0");
  const orderValue = parseFloat(size || "0") * orderPrice;
  const marginRequired = orderValue / leverage;

  // Determine button state
  const getButtonContent = () => {
    if (isSubmitting || isAuthenticating) {
      return (
        <>
          <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
          {isAuthenticating ? "Authenticating..." : "Placing Order..."}
        </>
      );
    }
    
    if (!isConnected) {
      return (
        <>
          <Wallet className="w-5 h-5 inline mr-2" />
          Connect Wallet
        </>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <>
          <Wallet className="w-5 h-5 inline mr-2" />
          Authenticate to Trade
        </>
      );
    }
    
    const action = activeTab === "open" ? (side === "long" ? "Buy / Long" : "Sell / Short") : 
                   activeTab === "close" ? "Close Position" : "Set TP/SL";
    return action;
  };

  const getButtonClass = () => {
    if (!isConnected || !isAuthenticated) {
      return "bg-gradient-to-r from-purple-600 to-purple-500 text-white";
    }
    
    if (activeTab === "close") {
      return "bg-gradient-to-r from-orange-600 to-orange-500 text-white";
    }
    
    if (side === "long") {
      return "bg-gradient-to-r from-cyan-600 to-cyan-500 text-black";
    }
    
    return "bg-gradient-to-r from-magenta-600 to-magenta-500 text-white";
  };

  // Prevent hydration mismatch - show loading state during SSR and initial hydration
  if (!mounted) {
    return (
      <div className="h-full flex flex-col bg-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="relative z-10 flex flex-col h-full items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <span className="text-gray-500 text-xs mt-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#080808] relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Tabs: Open / Close / TP-SL */}
        <div className="flex gap-1 p-2 border-b border-white/10 bg-black/50">
          {(["open", "close", "tpsl"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-all ${
                activeTab === tab
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab === "open" ? "Open" : tab === "close" ? "Close" : "TP/SL"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Order Type (only for Open/Close) */}
          {activeTab !== "tpsl" && (
            <div className="flex gap-1 mb-4 p-1 bg-black rounded-lg border border-white/10">
              {(["limit", "market"] as OrderType[]).map((type) => (
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
          )}

          {/* Side Selection (only for Open) */}
          {activeTab === "open" && (
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
          )}

          {/* Position Info (for Close/TP-SL) */}
          {(activeTab === "close" || activeTab === "tpsl") && position && (
            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-500">Current Position</span>
                <span className={positionSide === "long" ? "text-cyan-400" : "text-magenta-400"}>
                  {positionSide === "long" ? "LONG" : "SHORT"} {positionSize.toFixed(4)} {coin}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Entry Price</span>
                <span className="text-white">${parseFloat(position.entryPx).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Price Input */}
            {orderType !== "market" && activeTab !== "tpsl" && (
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
                  <span>Price (USD)</span>
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

            {/* TP/SL Inputs */}
            {activeTab === "tpsl" && (
              <>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase">Take Profit</div>
                  <div className="relative">
                    <input
                      type="number"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-green-500 focus:outline-none transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase">Stop Loss</div>
                  <div className="relative">
                    <input
                      type="number"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</div>
                  </div>
                </div>
              </>
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
                      onClick={() => {
                        // Calculate size based on percentage of position or estimated max
                        const maxSize = positionSize || 1;
                        const pctNum = parseInt(pct) / 100;
                        setSize((maxSize * pctNum).toFixed(4));
                      }}
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

            {/* Leverage Slider (only for Open) */}
            {activeTab === "open" && (
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
            )}

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
              {account && (
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Available</span>
                  <span className="text-white">
                    {parseFloat(account.marginSummary.totalRawUsd).toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {orderStatus && (
          <div className={`mx-4 mb-2 p-2 rounded flex items-center gap-2 text-[10px] ${
            orderStatus.type === "loading" ? "bg-blue-500/20 text-blue-400" :
            orderStatus.type === "success" ? "bg-green-500/20 text-green-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {orderStatus.type === "loading" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : orderStatus.type === "success" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {orderStatus.message}
          </div>
        )}

        {/* Place Order Button */}
        <div className="p-4 pt-0">
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isAuthenticating}
            className={`w-full py-4 rounded font-black uppercase tracking-[0.15em] text-sm transition-all ${getButtonClass()} 
              ${(isSubmitting || isAuthenticating) ? "opacity-70 cursor-not-allowed" : "hover:brightness-110 active:scale-[0.98]"}
              shadow-[0_0_20px_rgba(6,182,212,0.3)]`}
          >
            {getButtonContent()}
          </button>
        </div>
      </div>
    </div>
  );
};
