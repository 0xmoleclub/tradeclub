"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PlaceOrderProps {
  symbol?: string;
}

type OrderType = "limit" | "market" | "stop";
type OrderSide = "long" | "short";

interface AccountSummary {
  accountValue: string;
  freeCollateral: string;
  marginUsed: string;
  leverage: string;
  positions: Position[];
}

interface Position {
  coin: string;
  szi: string;  // size (negative for short)
  entryPx: string;
  leverage: { value: string; type: "cross" | "isolated" };
  liquidationPx: string | null;
  unrealizedPnl: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const PlaceOrder = ({ symbol = "BTC-PERP" }: PlaceOrderProps) => {
  // Auth context
  const { isConnected, token, walletAddress, login, connect } = useAuth();

  // Extract coin from symbol (e.g., "BTC-PERP" -> "BTC")
  const coin = symbol.split("-")[0];

  // Form state
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<OrderSide>("long");
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(10);
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [postOnly, setPostOnly] = useState<boolean>(false);
  const [reduceOnly, setReduceOnly] = useState<boolean>(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Account data
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [markPrice, setMarkPrice] = useState<number>(0);

  // Handle connect and login
  const handleConnect = async () => {
    await connect();
  };

  // Fetch account data when connected
  const fetchAccountData = useCallback(async () => {
    if (!isConnected || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/hypercore/account`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success && data.account) {
        // Parse account data from Hyperliquid format
        const accountData = data.account;
        const positions = accountData.assetPositions || [];
        
        setAccount({
          accountValue: accountData.accountValue || "0",
          freeCollateral: accountData.freeCollateral || "0",
          marginUsed: accountData.marginUsed || "0",
          leverage: accountData.leverage?.value || "1",
          positions: positions.map((p: any) => p.position),
        });

        // Find current position for this coin
        const pos = positions.find((p: any) => p.position?.coin === coin);
        setCurrentPosition(pos?.position || null);
      }
    } catch (err) {
      console.error("[PlaceOrder] Failed to fetch account:", err);
    }
  }, [token, coin]);

  // Fetch account data periodically
  useEffect(() => {
    if (isConnected && token) {
      fetchAccountData();
      const interval = setInterval(fetchAccountData, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, token, fetchAccountData]);

  // Fetch mark price from Hyperliquid directly
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
          // Set default price for limit orders
          if (!price && orderType === "limit") {
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
  }, [coin, orderType, price]);

  // Calculate order value
  const orderValue = parseFloat(size || "0") * (orderType === "market" ? markPrice : parseFloat(price || "0"));
  const marginRequired = orderValue / leverage;

  // Quick size buttons
  const setSizePercent = (percent: number) => {
    if (!account?.freeCollateral) return;
    const collateral = parseFloat(account.freeCollateral);
    const maxPosition = collateral * leverage;
    const newSize = (maxPosition * percent / 100) / (orderType === "market" ? markPrice : parseFloat(price || markPrice.toString()));
    setSize(newSize.toFixed(4));
  };

  // Place order handler
  const handlePlaceOrder = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    if (!token) {
      // Try to login
      const loggedIn = await login();
      if (!loggedIn) {
        setError("Please login to place orders");
        return;
      }
    }

    if (!size || parseFloat(size) <= 0) {
      setError("Please enter a valid size");
      return;
    }

    if (orderType !== "market" && (!price || parseFloat(price) <= 0)) {
      setError("Please enter a valid price");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let endpoint = "";
      let body: any = {};

      const isBuy = side === "long";

      switch (orderType) {
        case "market":
          endpoint = "/hypercore/orders/market/open";
          body = {
            coin,
            isBuy,
            size: size.toString(),
          };
          break;

        case "limit":
          endpoint = "/hypercore/orders/limit/open";
          body = {
            coin,
            isBuy,
            price: price.toString(),
            size: size.toString(),
            postOnly,
          };
          break;

        case "stop":
          // Stop orders are TP/SL in Hyperliquid
          if (side === "long") {
            endpoint = "/hypercore/orders/stop-loss";
            body = {
              coin,
              isBuy, // true for long
              size: size.toString(),
              stopLossPrice: price.toString(),
              stopLossTrigger: triggerPrice.toString(),
            };
          } else {
            endpoint = "/hypercore/orders/take-profit";
            body = {
              coin,
              isBuy, // false for short
              size: size.toString(),
              takeProfitPrice: price.toString(),
              takeProfitTrigger: triggerPrice.toString(),
            };
          }
          break;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Order failed: ${response.statusText}`);
      }

      setSuccess(`Order placed successfully! Order ID: ${data.orderId || data.oid || "N/A"}`);
      
      // Reset form
      setSize("");
      if (orderType === "limit") {
        setPrice(markPrice.toFixed(2));
      }
      
      // Refresh account data
      fetchAccountData();
    } catch (err) {
      console.error("[PlaceOrder] Order failed:", err);
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  // Close position handler
  const handleClosePosition = async () => {
    if (!isConnected || !token || !currentPosition) return;

    setLoading(true);
    setError(null);

    try {
      const isLong = parseFloat(currentPosition.szi) > 0;
      const sizeToClose = Math.abs(parseFloat(currentPosition.szi)).toString();

      const response = await fetch(`${API_BASE_URL}/hypercore/orders/market/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coin,
          size: sizeToClose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Close position failed");
      }

      setSuccess("Position closed successfully!");
      fetchAccountData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close position");
    } finally {
      setLoading(false);
    }
  };

  // Format number for display
  const formatNumber = (num: string | number, decimals = 2) => {
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(n)) return "0.00";
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Position display
  const positionSize = currentPosition ? parseFloat(currentPosition.szi) : 0;
  const positionValue = positionSize * (currentPosition ? parseFloat(currentPosition.entryPx) : 0);
  const isLongPosition = positionSize > 0;

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#080808]">
        <Wallet className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400 text-sm mb-4">Connect your wallet to trade</p>
        <button 
          className="px-6 py-2 bg-neon text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-neon/80 transition-colors"
          onClick={handleConnect}
        >
          Connect Wallet
        </button>
      </div>
    );
  }
  
  if (!token) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#080808]">
        <Wallet className="w-12 h-12 text-cyan-500 mb-4" />
        <p className="text-gray-400 text-sm mb-2">Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
        <p className="text-gray-400 text-sm mb-4">Login to start trading</p>
        <button 
          className="px-6 py-2 bg-neon text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-neon/80 transition-colors"
          onClick={login}
        >
          Login
        </button>
      </div>
    );
  }

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
                  Mark: {formatNumber(markPrice)}
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

          {/* Trigger Price for Stop Orders */}
          {orderType === "stop" && (
            <div>
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase">
                <span>Execution Price (USD)</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
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
                {[25, 50, 75, 100].map((pct) => (
                  <span
                    key={pct}
                    className="cursor-pointer hover:text-white transition-colors"
                    onClick={() => setSizePercent(pct)}
                  >
                    {pct}%
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

          {/* Order Options */}
          {orderType === "limit" && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-[10px] text-gray-400">Post Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceOnly}
                  onChange={(e) => setReduceOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-[10px] text-gray-400">Reduce Only</span>
              </label>
            </div>
          )}

          {/* Order Summary */}
          <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Order Value</span>
              <span className="text-white">{formatNumber(orderValue)} USD</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Margin Required</span>
              <span className="text-white">{formatNumber(marginRequired)} USD</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Available Collateral</span>
              <span className="text-white">{formatNumber(account?.freeCollateral || "0")} USD</span>
            </div>
          </div>

          {/* Current Position */}
          {currentPosition && positionSize !== 0 && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-500 uppercase">Current Position</span>
                <button
                  onClick={handleClosePosition}
                  disabled={loading}
                  className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className={isLongPosition ? "text-cyan-400" : "text-magenta-400"}>
                  {isLongPosition ? "Long" : "Short"} {Math.abs(positionSize).toFixed(4)} {coin}
                </span>
                <span className="text-gray-400">
                  Entry: {formatNumber(currentPosition.entryPx)}
                </span>
              </div>
              {currentPosition.liquidationPx && (
                <div className="text-[9px] text-orange-500 mt-1">
                  Liq. Price: {formatNumber(currentPosition.liquidationPx)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400">
            {success}
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !size || parseFloat(size) <= 0}
          className={`mt-4 w-full py-4 rounded font-black uppercase tracking-[0.15em] text-sm transition-all ${
            side === "long"
              ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              : "bg-gradient-to-r from-magenta-600 to-magenta-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            `${side === "long" ? "Buy" : "Sell"} ${coin}`
          )}
        </button>
      </div>
    </div>
  );
};
