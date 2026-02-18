"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, 
  Wallet, 
  Clock, 
  History,
  Receipt,
  Layers,
  Activity,
  AlertCircle,
  CheckCircle2,
  X,
  Zap
} from "lucide-react";
import { useAccount } from "wagmi";
import { 
  useHyperliquidAccount, 
  useHyperliquidOrders, 
  useHyperliquidFills,
  useHyperliquidTwap,
  useHyperliquidFunding,
  useHyperliquidOrderHistory,
  type Position,
  type OpenOrder,
  type UserFill,
  type TwapSliceFill,
  type FundingPayment,
  type HistoricalOrder,
} from "@/hooks";

interface TradingPanelProps {
  symbol?: string;
}

type TabType = "positions" | "orders" | "twap" | "fills" | "funding" | "history";

// Format helpers
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (price: number | string) => {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "-";
  if (num >= 10000) return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
};

const formatSize = (size: number | string) => {
  const num = typeof size === "string" ? parseFloat(size) : size;
  if (isNaN(num)) return "-";
  if (Math.abs(num) >= 1000) return num.toFixed(2);
  if (Math.abs(num) >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const formatValue = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-$";
  return `$${Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};

// ==================== POSITIONS TAB ====================
const PositionsTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { positions, account, isLoading, error } = useHyperliquidAccount();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const filteredPositions = coin 
    ? positions.filter((p) => p.coin === coin)
    : positions;

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view positions</span>
      </div>
    );
  }

  if (isLoading && positions.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-[10px] text-gray-500">Loading positions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-red-400 gap-2">
        <AlertCircle className="w-8 h-8" />
        <span className="text-xs text-center px-4">{error}</span>
      </div>
    );
  }

  if (filteredPositions.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Layers className="w-8 h-8 opacity-30" />
        <span className="text-xs">No open positions</span>
        <span className="text-[10px] text-gray-700">Start trading to open a position</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {account && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Account Value</div>
            <div className="text-sm font-mono text-white">
              {formatValue(account.marginSummary.accountValue)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Margin Used</div>
            <div className="text-sm font-mono text-yellow-400">
              {formatValue(account.marginSummary.totalMarginUsed)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Available</div>
            <div className="text-sm font-mono text-cyan-400">
              {formatValue(account.marginSummary.totalRawUsd)}
            </div>
          </div>
        </div>
      )}

      {filteredPositions.map((pos) => {
        const size = parseFloat(pos.szi);
        const entryPx = parseFloat(pos.entryPx);
        const positionValue = parseFloat(pos.positionValue);
        const unrealizedPnl = parseFloat(pos.unrealizedPnl);
        const leverage = parseFloat(pos.leverage);
        const liquidationPx = parseFloat(pos.liquidationPx);
        const isLong = size > 0;
        const absSize = Math.abs(size);
        const pnlPercent = entryPx > 0 ? (unrealizedPnl / (absSize * entryPx)) * 100 : 0;

        return (
          <div 
            key={pos.coin} 
            className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{pos.coin}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  isLong ? "bg-cyan-500/20 text-cyan-400" : "bg-magenta-500/20 text-magenta-400"
                }`}>
                  {isLong ? "LONG" : "SHORT"} {leverage.toFixed(0)}x
                </span>
              </div>
              <div className={`text-sm font-mono font-bold ${
                unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {unrealizedPnl >= 0 ? "+" : ""}{formatValue(unrealizedPnl)}
                <span className="text-[10px] ml-1 opacity-70">
                  ({formatPercent(pnlPercent)})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Size</span>
                <span className="font-mono text-white">{formatSize(absSize)} {pos.coin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Position Value</span>
                <span className="font-mono text-white">{formatValue(positionValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entry Price</span>
                <span className="font-mono text-white">{formatPrice(entryPx)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Liquidation</span>
                <span className={`font-mono ${
                  liquidationPx > 0 ? "text-red-400" : "text-gray-600"
                }`}>
                  {liquidationPx > 0 ? formatPrice(liquidationPx) : "-"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== OPEN ORDERS TAB ====================
const OpenOrdersTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { orders, isLoading, error } = useHyperliquidOrders();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredOrders = coin
    ? orders.filter((o) => o.coin === coin)
    : orders;

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view orders</span>
      </div>
    );
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-[10px] text-gray-500">Loading orders...</span>
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Clock className="w-8 h-8 opacity-30" />
        <span className="text-xs">No open orders</span>
        <span className="text-[10px] text-gray-700">Your active orders will appear here</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="text-gray-500 border-b border-white/10">
          <tr>
            <th className="text-left py-2 px-2">Coin</th>
            <th className="text-left py-2 px-2">Side</th>
            <th className="text-left py-2 px-2">Type</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">Size</th>
            <th className="text-right py-2 px-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr key={order.oid} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 px-2 font-medium text-white">{order.coin}</td>
              <td className="py-2 px-2">
                <span className={order.side === "B" ? "text-cyan-400" : "text-magenta-400"}>
                  {order.side === "B" ? "Buy" : "Sell"}
                </span>
              </td>
              <td className="py-2 px-2">
                <span className="text-gray-400">
                  {order.isTrigger ? (order.tpsl === "tp" ? "TP" : "SL") : "Limit"}
                  {order.reduceOnly && " (Reduce)"}
                </span>
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatPrice(order.limitPx)}
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatSize(order.sz)}
              </td>
              <td className="py-2 px-2 text-right text-gray-500">
                {formatTime(order.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== TWAP TAB ====================
const TwapTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { twapFills, isLoading, error } = useHyperliquidTwap();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredTwapFills = coin
    ? twapFills.filter((t) => t.fill.coin === coin)
    : twapFills;

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view TWAP fills</span>
      </div>
    );
  }

  if (isLoading && twapFills.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (filteredTwapFills.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Zap className="w-8 h-8 opacity-30" />
        <span className="text-xs">No TWAP fills</span>
        <span className="text-[10px] text-gray-700">TWAP order slices will appear here</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="text-gray-500 border-b border-white/10">
          <tr>
            <th className="text-left py-2 px-2">Time</th>
            <th className="text-left py-2 px-2">Coin</th>
            <th className="text-left py-2 px-2">Side</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">Size</th>
            <th className="text-right py-2 px-2">TWAP ID</th>
          </tr>
        </thead>
        <tbody>
          {filteredTwapFills.slice(0, 100).map((twap, idx) => (
            <tr key={`${twap.twapId}-${twap.fill.tid}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 px-2 text-gray-500">{formatTime(twap.fill.time)}</td>
              <td className="py-2 px-2 font-medium text-white">{twap.fill.coin}</td>
              <td className="py-2 px-2">
                <span className={twap.fill.side === "B" ? "text-cyan-400" : "text-magenta-400"}>
                  {twap.fill.side === "B" ? "Buy" : "Sell"}
                </span>
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatPrice(twap.fill.px)}
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatSize(twap.fill.sz)}
              </td>
              <td className="py-2 px-2 text-right font-mono text-gray-400">
                #{twap.twapId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== FILLS TAB (ALL TRADES) ====================
const FillsTab = () => {
  const { isConnected } = useAccount();
  const { fills, isLoading, error } = useHyperliquidFills();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view fills</span>
      </div>
    );
  }

  if (isLoading && fills.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (fills.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Activity className="w-8 h-8 opacity-30" />
        <span className="text-xs">No recent fills</span>
        <span className="text-[10px] text-gray-700">Your trade history will appear here</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="text-gray-500 border-b border-white/10">
          <tr>
            <th className="text-left py-2 px-2">Time</th>
            <th className="text-left py-2 px-2">Coin</th>
            <th className="text-left py-2 px-2">Side</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">Size</th>
            <th className="text-right py-2 px-2">PnL</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((fill, idx) => {
            const isBuy = fill.side === "B";
            const pnl = fill.closedPnl ? parseFloat(fill.closedPnl) : null;
            
            return (
              <tr key={`${fill.hash}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 px-2 text-gray-500">{formatTime(fill.time)}</td>
                <td className="py-2 px-2 font-medium text-white">{fill.coin}</td>
                <td className="py-2 px-2">
                  <span className={isBuy ? "text-cyan-400" : "text-magenta-400"}>
                    {isBuy ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-mono text-white">
                  {formatPrice(fill.px)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-white">
                  {formatSize(fill.sz)}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {pnl !== null ? (
                    <span className={pnl >= 0 ? "text-green-400" : "text-red-400"}>
                      {pnl >= 0 ? "+" : ""}{formatValue(pnl)}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ==================== FUNDING TAB ====================
const FundingTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { fundingHistory, stats, isLoading, error } = useHyperliquidFunding();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show all funding history (like Trade History), not filtered by coin
  const filteredHistory = fundingHistory;

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view funding</span>
      </div>
    );
  }

  if (isLoading && fundingHistory.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (filteredHistory.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Receipt className="w-8 h-8 opacity-30" />
        <span className="text-xs">No funding payments</span>
        <span className="text-[10px] text-gray-700">Funding occurs every 8 hours</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Funding Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
        <div>
          <div className="text-[10px] text-gray-500 uppercase">Total Paid</div>
          <div className="text-sm font-mono text-red-400">{formatValue(stats.totalPaid)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">Total Received</div>
          <div className="text-sm font-mono text-green-400">{formatValue(stats.totalReceived)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">Net</div>
          <div className={`text-sm font-mono ${stats.netFunding >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.netFunding >= 0 ? "+" : ""}{formatValue(stats.netFunding)}
          </div>
        </div>
      </div>

      {/* Funding History Table */}
      <div className="overflow-auto max-h-64">
        <table className="w-full text-[11px]">
          <thead className="text-gray-500 border-b border-white/10 sticky top-0 bg-[#0a0a0a]">
            <tr>
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Coin</th>
              <th className="text-right py-2 px-2">Rate</th>
              <th className="text-right py-2 px-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.slice(0, 100).map((funding, idx) => (
              <tr key={`${funding.hash}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 px-2 text-gray-500">{formatDateTime(funding.time)}</td>
                <td className="py-2 px-2 font-medium text-white">{funding.coin}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-400">
                  {(parseFloat(funding.fundingRate) * 100).toFixed(4)}%
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  <span className={funding.side === "received" ? "text-green-400" : "text-red-400"}>
                    {funding.side === "received" ? "+" : "-"}{formatValue(Math.abs(parseFloat(funding.usdc)))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== ORDER HISTORY TAB ====================
const OrderHistoryTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { orders, isLoading, error } = useHyperliquidOrderHistory();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredOrders = coin
    ? orders.filter(o => o.order.coin === coin)
    : orders;

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Wallet className="w-8 h-8 opacity-50" />
        <span className="text-xs">Connect wallet to view order history</span>
      </div>
    );
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
        <History className="w-8 h-8 opacity-30" />
        <span className="text-xs">No order history</span>
        <span className="text-[10px] text-gray-700">Your placed/canceled orders will appear here</span>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filled":
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case "canceled":
        return <X className="w-3 h-3 text-gray-400" />;
      case "open":
        return <Clock className="w-3 h-3 text-yellow-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-red-400" />;
    }
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="text-gray-500 border-b border-white/10">
          <tr>
            <th className="text-left py-2 px-2">Time</th>
            <th className="text-left py-2 px-2">Coin</th>
            <th className="text-left py-2 px-2">Type</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">Size</th>
            <th className="text-center py-2 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.slice(0, 100).map((item, idx) => (
            <tr key={`${item.order.oid}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 px-2 text-gray-500">{formatTime(item.statusTimestamp)}</td>
              <td className="py-2 px-2 font-medium text-white">{item.order.coin}</td>
              <td className="py-2 px-2">
                <span className="text-gray-400">
                  {item.order.orderType}
                  {item.order.reduceOnly && " (Reduce)"}
                </span>
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatPrice(item.order.limitPx)}
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">
                {formatSize(item.order.origSz)}
              </td>
              <td className="py-2 px-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {getStatusIcon(item.status)}
                  <span className={`capitalize ${
                    item.status === "filled" ? "text-green-400" : 
                    item.status === "canceled" ? "text-gray-400" : 
                    item.status === "open" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export const TradingPanel = ({ symbol = "BTC-PERP" }: TradingPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("positions");
  const coin = symbol.split("-")[0];

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "positions", label: "Positions", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "orders", label: "Open Orders", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "twap", label: "TWAP", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "fills", label: "Trade History", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "funding", label: "Funding", icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: "history", label: "Order History", icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-white/10 bg-black/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-white/5"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "positions" && <PositionsTab coin={coin} />}
        {activeTab === "orders" && <OpenOrdersTab coin={coin} />}
        {activeTab === "twap" && <TwapTab coin={coin} />}
        {activeTab === "fills" && <FillsTab />}
        {activeTab === "funding" && <FundingTab coin={coin} />}
        {activeTab === "history" && <OrderHistoryTab coin={coin} />}
      </div>
    </div>
  );
};
