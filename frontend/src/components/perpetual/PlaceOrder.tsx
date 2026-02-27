"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Loader2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Shield,
  X,
  Settings2
} from "lucide-react";
import { useChainId } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { tradingApi, agentWalletApi } from "@/services/trading";
import { useHyperliquidAccount } from "@/hooks/useHyperliquidAccount";
import { useAuth } from "@/hooks";

interface PlaceOrderProps {
  symbol?: string;
}

type OrderType = "limit" | "market" | "twap";
type OrderSide = "long" | "short";

interface OrderStatus {
  type: "loading" | "success" | "error";
  message: string;
}

interface MarketMeta {
  coin: string;
  maxLeverage: number;
  szDecimals: number;
}

export const PlaceOrder = ({ symbol = "BTC-PERP" }: PlaceOrderProps) => {
  const coin = symbol.split("-")[0];
  const { isConnected: isWalletConnected, isSigning, signIn, canTrade } = useAuth();
  const { account, refetch: refetchAccount } = useHyperliquidAccount();
  const chainId = useChainId();
  
  // Check if on correct network
  const isCorrectNetwork = chainId === arbitrum.id;

  // Market metadata for leverage
  const [marketMeta, setMarketMeta] = useState<MarketMeta | null>(null);
  const [currentLeverage, setCurrentLeverage] = useState<number>(10);

  // UI State
  const [mounted, setMounted] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<OrderSide>("long");
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [tempLeverage, setTempLeverage] = useState(10);

  // Form inputs
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [markPrice, setMarkPrice] = useState<number>(0);
  
  // TWAP specific
  const [twapDuration, setTwapDuration] = useState<number>(10); // minutes
  const [twapRandomize, setTwapRandomize] = useState<boolean>(true);
  
  // TP/SL
  const [tpPrice, setTpPrice] = useState<string>("");
  const [slPrice, setSlPrice] = useState<string>("");
  const [showTpSl, setShowTpSl] = useState(false);
  
  // Order status
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingLeverage, setIsUpdatingLeverage] = useState(false);

  // Fetch market metadata (for max leverage)
  const fetchMarketMeta = useCallback(async () => {
    try {
      const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });
      if (!response.ok) return;
      
      const [meta] = await response.json();
      const assetMeta = meta.universe?.find((u: any) => u.name === coin);
      if (assetMeta) {
        setMarketMeta({
          coin: assetMeta.name,
          maxLeverage: assetMeta.maxLeverage,
          szDecimals: assetMeta.szDecimals,
        });
        setCurrentLeverage(Math.min(10, assetMeta.maxLeverage));
        setTempLeverage(Math.min(10, assetMeta.maxLeverage));
      }
    } catch (err) {
      console.error('[PlaceOrder] Failed to fetch market meta:', err);
    }
  }, [coin]);

  // Fetch mark price
  const fetchMarkPrice = useCallback(async () => {
    try {
      const response = await fetch('https://api.hyperliquid-testnet.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      });
      const data = await response.json();
      if (data?.[coin]) {
        setMarkPrice(parseFloat(data[coin]));
      }
    } catch (err) {
      console.error('[PlaceOrder] Failed to fetch price:', err);
    }
  }, [coin]);

  useEffect(() => {
    setMounted(true);
    fetchMarketMeta();
    fetchMarkPrice();
    
    const interval = setInterval(fetchMarkPrice, 5000);
    return () => clearInterval(interval);
  }, [fetchMarketMeta, fetchMarkPrice]);

  // Update price when coin changes (in limit mode) or when switching to limit mode
  useEffect(() => {
    if (orderType === "limit" && markPrice > 0) {
      setPrice(markPrice.toFixed(2));
    }
  }, [orderType, coin, markPrice]);

  // Ensure agent wallet
  const ensureAgentWallet = async () => {
    try {
      let wallet = await agentWalletApi.get();
      if (!wallet) {
        setOrderStatus({ type: "loading", message: "Creating agent wallet..." });
        wallet = await agentWalletApi.create();
      }
      return wallet;
    } catch (err: any) {
      console.error("[PlaceOrder] Agent wallet error:", err);
      throw err;
    }
  };

  // Update leverage via API
  const handleLeverageUpdate = async () => {
    if (!canTrade || tempLeverage === currentLeverage || isUpdatingLeverage) {
      if (!isUpdatingLeverage) {
        setShowLeverageModal(false);
      }
      return;
    }
    
    try {
      setIsUpdatingLeverage(true);
      setOrderStatus({ type: "loading", message: "Updating leverage..." });
      await tradingApi.updateLeverage(coin, tempLeverage);
      setCurrentLeverage(tempLeverage);
      setOrderStatus({ type: "success", message: "Leverage updated!" });
      setTimeout(() => setOrderStatus(null), 2000);
      setShowLeverageModal(false);
    } catch (err: any) {
      setOrderStatus({ type: "error", message: err.message || "Failed to update leverage" });
      setTimeout(() => setOrderStatus(null), 3000);
    } finally {
      setIsUpdatingLeverage(false);
    }
  };

  // Place order - ONLY for opening positions
  const handlePlaceOrder = async () => {
    if (!isCorrectNetwork) {
      setOrderStatus({ type: "error", message: "Please switch to Arbitrum network" });
      return;
    }

    if (!isWalletConnected) {
      setOrderStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!canTrade) {
      setOrderStatus({ type: "loading", message: "Please sign to authenticate..." });
      try {
        await signIn();
        await ensureAgentWallet();
      } catch (err: any) {
        setOrderStatus({ type: "error", message: err.message || "Authentication failed" });
        return;
      }
    }

    if (!size || parseFloat(size) <= 0) {
      setOrderStatus({ type: "error", message: "Enter valid size" });
      return;
    }

    // Limit order requires price
    if (orderType === "limit" && (!price || parseFloat(price) <= 0)) {
      setOrderStatus({ type: "error", message: "Enter valid price" });
      return;
    }

    // TWAP validation
    if (orderType === "twap") {
      if (twapDuration < 5 || twapDuration > 1440) {
        setOrderStatus({ type: "error", message: "TWAP duration must be 5-1440 minutes" });
        return;
      }
    }

    setIsSubmitting(true);
    setOrderStatus({ type: "loading", message: "Placing order..." });

    try {
      let response;
      const isBuy = side === "long";

      // Handle different order types
      if (orderType === "market") {
        response = await tradingApi.openMarketOrder({ 
          coin, 
          isBuy, 
          size: size.toString() 
        });
      } else if (orderType === "twap") {
        response = await tradingApi.placeTwapOrder({
          coin,
          isBuy,
          size: size.toString(),
          durationMinutes: twapDuration,
          randomize: twapRandomize,
        });
      } else {
        response = await tradingApi.openLimitOrder({ 
          coin, 
          isBuy, 
          price: price.toString(), 
          size: size.toString(),
          postOnly: false 
        });
      }

      // Handle TP/SL if set
      if (tpPrice || slPrice) {
        const positionIsBuy = side === "long";
        
        if (tpPrice && parseFloat(tpPrice) > 0) {
          await tradingApi.placeTakeProfit({
            coin,
            isBuy: positionIsBuy,
            size: size.toString(),
            takeProfitPrice: tpPrice.toString(),
            takeProfitTrigger: tpPrice.toString(),
          });
        }
        
        if (slPrice && parseFloat(slPrice) > 0) {
          await tradingApi.placeStopLoss({
            coin,
            isBuy: positionIsBuy,
            size: size.toString(),
            stopLossPrice: slPrice.toString(),
            stopLossTrigger: slPrice.toString(),
          });
        }
      }

      if (response?.success) {
        console.log('[PlaceOrder] Order response:', response);
        
        // Check if order was filled immediately or is resting
        const orderData = response.data;
        const filled = orderData?.status?.filled;
        const resting = orderData?.restingOrders;
        const twapId = response.twapId;
        
        let statusMsg = response.message || "Order placed!";
        if (twapId) {
          statusMsg = `TWAP order started: #${twapId}`;
        } else if (filled?.totalSz) {
          statusMsg = `Filled ${filled.totalSz} @ ${filled.avgPx}`;
        } else if (resting?.length > 0) {
          statusMsg = `Order placed: ${resting[0].oid}`;
        }
        
        setOrderStatus({ type: "success", message: statusMsg });
        setSize("");
        setTpPrice("");
        setSlPrice("");
        
        // Refetch account to update positions in real-time
        setTimeout(() => {
          refetchAccount();
        }, 500);
        
        setTimeout(() => setOrderStatus(null), 5000);
      }
    } catch (err: any) {
      console.error("[PlaceOrder] Order failed:", err);
      setOrderStatus({ type: "error", message: err.message || "Order failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const orderPrice = orderType === "market" ? markPrice : parseFloat(price || "0");
  const orderValue = parseFloat(size || "0") * orderPrice;
  const marginRequired = orderValue / currentLeverage;
  const maxLeverage = marketMeta?.maxLeverage || 50;

  // Size percentages based on available margin
  const getSizePercent = (pct: number) => {
    if (account && markPrice > 0) {
      const available = parseFloat(account.marginSummary.totalRawUsd);
      const maxSize = (available * currentLeverage) / markPrice;
      return (maxSize * pct).toFixed(marketMeta?.szDecimals || 4);
    }
    return "0";
  };

  // Button content
  const getButtonContent = () => {
    if (isSubmitting || isSigning) {
      return (
        <span className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {isSigning ? "Signing..." : "Placing..."}
        </span>
      );
    }
    if (!isWalletConnected) {
      return (
        <span className="flex items-center justify-center">
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </span>
      );
    }
    if (!canTrade) {
      return (
        <span className="flex items-center justify-center">
          <Shield className="w-4 h-4 mr-2" />
          Sign to Trade
        </span>
      );
    }
    return side === "long" ? "Buy / Long" : "Sell / Short";
  };

  const getButtonClass = () => {
    if (!isWalletConnected) return "bg-gray-600 text-white";
    if (!canTrade) return "bg-purple-600 text-white";
    return side === "long" 
      ? "bg-cyan-500 text-black hover:bg-cyan-400" 
      : "bg-magenta-500 text-white hover:bg-magenta-400";
  };

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Main Order Form */}
      <div className="h-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Place Order</h3>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Order Type Toggle */}
          <div className="flex p-1 bg-black/50 rounded-lg border border-white/10">
            {(["limit", "market", "twap"] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${
                  orderType === type
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* TWAP Info Banner */}
          {orderType === "twap" && (
            <div className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-[10px] text-cyan-400 font-medium">
                TWAP (Time-Weighted Average Price) splits your order into smaller slices executed over time to minimize market impact.
              </p>
            </div>
          )}

        {/* Side Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("long")}
            className={`py-3 rounded-lg font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
              side === "long"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Long
          </button>
          <button
            onClick={() => setSide("short")}
            className={`py-3 rounded-lg font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
              side === "short"
                ? "bg-magenta-500/20 text-magenta-400 border border-magenta-500/50"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Short
          </button>
        </div>

        {/* Price Input (Limit only) */}
        {orderType === "limit" && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-gray-500 uppercase font-mono">
              <span>Price</span>
              <button 
                onClick={() => setPrice(markPrice.toFixed(2))}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Mark: {markPrice.toFixed(2)}
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</span>
            </div>
          </div>
        )}

        {/* TWAP Duration (TWAP only) */}
        {orderType === "twap" && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-500 uppercase font-mono">
                <span>Duration (minutes)</span>
                <span className="text-gray-600">5-1440 min</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={twapDuration}
                  onChange={(e) => setTwapDuration(Math.max(5, Math.min(1440, parseInt(e.target.value) || 5)))}
                  min="5"
                  max="1440"
                  placeholder="10"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">min</span>
              </div>
              <div className="flex gap-2 text-[10px]">
                {[5, 10, 30, 60, 120].map((min) => (
                  <button
                    key={min}
                    onClick={() => setTwapDuration(min)}
                    className={`px-2 py-1 rounded border transition-colors ${
                      twapDuration === min
                        ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                        : "border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs text-gray-400">Randomize order timing</span>
              <button
                onClick={() => setTwapRandomize(!twapRandomize)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  twapRandomize ? "bg-cyan-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    twapRandomize ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Size Input */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-500 uppercase font-mono">
            <span>Size ({coin})</span>
            {isWalletConnected && (
              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSize(getSizePercent(pct))}
                    className="hover:text-white transition-colors"
                  >
                    {pct === 1 ? "MAX" : `${(pct * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-magenta-500 focus:outline-none transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">{coin}</span>
          </div>
        </div>

        {/* Leverage Button */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-500 uppercase font-mono">
            <span>Leverage</span>
            <span className="text-gray-600">Max: {maxLeverage}x (Isolated)</span>
          </div>
          <button
            onClick={() => setShowLeverageModal(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-black border border-white/10 rounded-lg hover:border-white/20 transition-colors"
          >
            <span className="text-sm font-mono text-white">{currentLeverage}x Isolated</span>
            <Settings2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* TP/SL Toggle */}
        <button
          onClick={() => setShowTpSl(!showTpSl)}
          className="w-full flex items-center justify-between py-2 text-[10px] text-gray-500 uppercase font-mono hover:text-white transition-colors"
        >
          <span>Take Profit / Stop Loss (Optional)</span>
          <span className={`transform transition-transform ${showTpSl ? "rotate-180" : ""}`}>▼</span>
        </button>

        {/* TP/SL Inputs */}
        {showTpSl && (
          <div className="space-y-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Take Profit</span>
              <div className="relative">
                <input
                  type="number"
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:border-green-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</span>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Stop Loss</span>
              <div className="relative">
                <input
                  type="number"
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-mono text-white focus:border-red-500 focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Order Value</span>
            <span className="font-mono text-white">${orderValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Margin Required</span>
            <span className="font-mono text-white">${marginRequired.toFixed(2)}</span>
          </div>
          {isWalletConnected && account && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Available</span>
              <span className="font-mono text-white">
                ${parseFloat(account.marginSummary.totalRawUsd).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {orderStatus && (
        <div className={`mx-4 mb-2 p-3 rounded-lg flex items-center gap-2 text-xs ${
          orderStatus.type === "loading" ? "bg-blue-500/20 text-blue-400" :
          orderStatus.type === "success" ? "bg-green-500/20 text-green-400" :
          "bg-red-500/20 text-red-400"
        }`}>
          {orderStatus.type === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : orderStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {orderStatus.message}
        </div>
      )}

      {/* Action Button */}
      <div className="p-4 pt-2">
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || isSigning}
          className={`w-full py-4 rounded-lg font-black uppercase tracking-wider text-sm transition-all flex items-center justify-center ${getButtonClass()} 
            ${(isSubmitting || isSigning) ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-[0.98]"}`}
        >
          {getButtonContent()}
        </button>
        
        {!isWalletConnected && (
          <p className="text-center text-[10px] text-gray-600 mt-2">Connect wallet to trade</p>
        )}
        {isWalletConnected && !canTrade && (
          <p className="text-center text-[10px] text-purple-400/70 mt-2">Sign to verify ownership</p>
        )}
      </div>
    </div>

    {/* Leverage Modal - Portal to document.body to escape overflow-hidden containers */}
    {showLeverageModal && typeof window !== 'undefined' && createPortal(
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Adjust Isolated Leverage</h3>
            <button 
              onClick={() => setShowLeverageModal(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="text-center">
              <span className="text-4xl font-black text-white">{tempLeverage}x</span>
              <p className="text-xs text-gray-500 mt-1">Max: {maxLeverage}x</p>
            </div>
            
            <input
              type="range"
              min="1"
              max={maxLeverage}
              value={tempLeverage}
              onChange={(e) => setTempLeverage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            
            <div className="flex justify-between text-[10px] text-gray-600 font-mono">
              <span>1x</span>
              <span>{Math.floor(maxLeverage / 2)}x</span>
              <span>{maxLeverage}x</span>
            </div>
          </div>
          
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={handleLeverageUpdate}
              disabled={!canTrade || isUpdatingLeverage || tempLeverage === currentLeverage}
              className="w-full py-3 bg-cyan-500 text-black font-bold uppercase text-xs rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdatingLeverage && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUpdatingLeverage ? "Updating..." : canTrade ? "Confirm" : "Sign to Update"}
            </button>
            <button
              onClick={() => setShowLeverageModal(false)}
              disabled={isUpdatingLeverage}
              className="w-full py-3 bg-transparent text-gray-500 font-bold uppercase text-xs rounded-lg hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
