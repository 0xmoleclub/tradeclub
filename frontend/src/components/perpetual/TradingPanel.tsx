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
  useAuth,
  type Position,
  type OpenOrder,
  type UserFill,
  type TwapSliceFill,
  type FundingPayment,
  type HistoricalOrder,
} from "@/hooks";
import { tradingApi } from "@/services/trading";
import { RequireWallet } from "@/components/auth";

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

// Empty state component for no data
const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
  <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
    <Icon className="w-8 h-8 opacity-30" />
    <span className="text-xs">{title}</span>
    <span className="text-[10px] text-gray-700">{subtitle}</span>
  </div>
);

// Connect wallet prompt component
const ConnectWalletPrompt = ({ message = "Connect your wallet to view personal trading data" }: { message?: string }) => (
  <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-3">
    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
      <Wallet className="w-6 h-6 text-gray-500" />
    </div>
    <div className="text-center">
      <p className="text-sm font-bold text-white">Connect Wallet</p>
      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{message}</p>
    </div>
  </div>
);

// ==================== CLOSE POSITION MODAL ====================
interface ClosePositionModalProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ClosePositionModal = ({ position, isOpen, onClose, onSuccess }: ClosePositionModalProps) => {
  const { signIn, canTrade } = useAuth();
  const [closeType, setCloseType] = useState<"market" | "limit">("market");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{type: "loading" | "success" | "error", message: string} | null>(null);
  
  const size = Math.abs(parseFloat(position.szi)).toString();
  const isLong = parseFloat(position.szi) > 0;

  const handleClose = async () => {
    if (!canTrade) {
      setStatus({ type: "loading", message: "Authenticating..." });
      try {
        await signIn();
      } catch (err: any) {
        setStatus({ type: "error", message: err.message || "Authentication failed" });
        return;
      }
    }

    if (closeType === "limit" && (!price || parseFloat(price) <= 0)) {
      setStatus({ type: "error", message: "Enter valid price" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "loading", message: "Closing position..." });

    try {
      let response;
      if (closeType === "market") {
        response = await tradingApi.closeMarketOrder({
          coin: position.coin,
          size: size.toString(),
        });
      } else {
        response = await tradingApi.closeLimitOrder({
          coin: position.coin,
          size: size.toString(),
          price: price.toString(),
          postOnly: false,
        });
      }

      if (response?.success) {
        setStatus({ type: "success", message: "Position closed!" });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Close failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-sm font-bold text-white">Close Position</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Position Summary */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">{position.coin}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLong ? "bg-cyan-500/20 text-cyan-400" : "bg-magenta-500/20 text-magenta-400"}`}>
                {isLong ? "LONG" : "SHORT"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Size</span>
              <span className="font-mono text-white">{size} {position.coin}</span>
            </div>
          </div>

          {/* Close Type */}
          <div className="flex p-1 bg-black/50 rounded-lg border border-white/10">
            <button
              onClick={() => setCloseType("market")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${
                closeType === "market" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setCloseType("limit")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${
                closeType === "limit" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
              }`}
            >
              Limit
            </button>
          </div>

          {/* Price Input (Limit only) */}
          {closeType === "limit" && (
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-mono">Close Price</span>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</span>
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`p-2 rounded text-xs flex items-center gap-2 ${
              status.type === "loading" ? "bg-blue-500/20 text-blue-400" :
              status.type === "success" ? "bg-green-500/20 text-green-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {status.type === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
              {status.message}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Closing..." : `Close ${closeType === "market" ? "Market" : "Limit"}`}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-transparent text-gray-500 font-bold uppercase text-xs rounded-lg hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== POSITIONS TAB ====================
const PositionsTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { positions, account, isLoading, error, refetch } = useHyperliquidAccount();
  const [mounted, setMounted] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  useEffect(() => setMounted(true), []);
  
  const handleCloseClick = (pos: Position) => {
    setSelectedPosition(pos);
    setCloseModalOpen(true);
  };

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view positions" />;
  }

  const filteredPositions = coin ? positions.filter((p) => p.coin === coin) : positions;

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
    return <EmptyState icon={Layers} title="No open positions" subtitle="Start trading to open a position" />;
  }

  return (
    <>
      <div className="space-y-3">
        {account && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Account Value</div>
              <div className="text-sm font-mono text-white">{formatValue(account.marginSummary.accountValue)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Margin Used</div>
              <div className="text-sm font-mono text-yellow-400">{formatValue(account.marginSummary.totalMarginUsed)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Available</div>
              <div className="text-sm font-mono text-cyan-400">{formatValue(account.marginSummary.totalRawUsd)}</div>
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
            <div key={pos.coin} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{pos.coin}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${isLong ? "bg-cyan-500/20 text-cyan-400" : "bg-magenta-500/20 text-magenta-400"}`}>
                    {isLong ? "LONG" : "SHORT"} {leverage.toFixed(0)}x Isolated
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-mono font-bold ${unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {unrealizedPnl >= 0 ? "+" : ""}{formatValue(unrealizedPnl)}
                    <span className="text-[10px] ml-1 opacity-70">({formatPercent(pnlPercent)})</span>
                  </div>
                  <button
                    onClick={() => handleCloseClick(pos)}
                    className="px-3 py-1 bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded text-[10px] font-bold uppercase hover:bg-orange-600/30 transition-colors"
                  >
                    Close
                  </button>
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
                  <span className={`font-mono ${liquidationPx > 0 ? "text-red-400" : "text-gray-600"}`}>
                    {liquidationPx > 0 ? formatPrice(liquidationPx) : "-"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Position Modal */}
      {selectedPosition && (
        <ClosePositionModal
          position={selectedPosition}
          isOpen={closeModalOpen}
          onClose={() => setCloseModalOpen(false)}
          onSuccess={refetch}
        />
      )}
    </>
  );
};

// ==================== OPEN ORDERS TAB ====================
const OpenOrdersTab = ({ coin }: { coin: string }) => {
  const { isConnected } = useAccount();
  const { orders, isLoading } = useHyperliquidOrders();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view open orders" />;
  }

  const filteredOrders = coin ? orders.filter((o) => o.coin === coin) : orders;

  if (isLoading && orders.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-[10px] text-gray-500">Loading orders...</span>
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return <EmptyState icon={Clock} title="No open orders" subtitle="Your active orders will appear here" />;
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
              <td className="py-2 px-2 text-right font-mono text-white">{formatPrice(order.limitPx)}</td>
              <td className="py-2 px-2 text-right font-mono text-white">{formatSize(order.sz)}</td>
              <td className="py-2 px-2 text-right text-gray-500">{formatTime(order.timestamp)}</td>
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
  const { twapFills, isLoading } = useHyperliquidTwap();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view TWAP fills" />;
  }

  const filteredTwapFills = coin ? twapFills.filter((t) => t.fill.coin === coin) : twapFills;

  if (isLoading && twapFills.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (filteredTwapFills.length === 0) {
    return <EmptyState icon={Zap} title="No TWAP fills" subtitle="TWAP order slices will appear here" />;
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
              <td className="py-2 px-2 text-right font-mono text-white">{formatPrice(twap.fill.px)}</td>
              <td className="py-2 px-2 text-right font-mono text-white">{formatSize(twap.fill.sz)}</td>
              <td className="py-2 px-2 text-right font-mono text-gray-400">#{twap.twapId}</td>
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
  const { fills, isLoading } = useHyperliquidFills();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view trade history" />;
  }

  if (isLoading && fills.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (fills.length === 0) {
    return <EmptyState icon={Activity} title="No recent fills" subtitle="Your trade history will appear here" />;
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
                <td className="py-2 px-2 text-right font-mono text-white">{formatPrice(fill.px)}</td>
                <td className="py-2 px-2 text-right font-mono text-white">{formatSize(fill.sz)}</td>
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
const FundingTab = () => {
  const { isConnected } = useAccount();
  const { fundingHistory, stats, isLoading } = useHyperliquidFunding();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view funding payments" />;
  }

  if (isLoading && fundingHistory.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (fundingHistory.length === 0) {
    return <EmptyState icon={Receipt} title="No funding payments" subtitle="Funding occurs every 8 hours" />;
  }

  return (
    <div className="space-y-3">
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
            {fundingHistory.slice(0, 100).map((funding, idx) => (
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
  const { orders, isLoading } = useHyperliquidOrderHistory();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt message="Connect your wallet to view order history" />;
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <EmptyState icon={History} title="No order history" subtitle="Your placed/canceled orders will appear here" />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filled": return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case "canceled": return <X className="w-3 h-3 text-gray-400" />;
      case "open": return <Clock className="w-3 h-3 text-yellow-400" />;
      default: return <AlertCircle className="w-3 h-3 text-red-400" />;
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
          {orders.slice(0, 100).map((item, idx) => (
            <tr key={`${item.order.oid}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 px-2 text-gray-500">{formatTime(item.statusTimestamp)}</td>
              <td className="py-2 px-2 font-medium text-white">{item.order.coin}</td>
              <td className="py-2 px-2">
                <span className="text-gray-400">
                  {item.order.orderType}
                  {item.order.reduceOnly && " (Reduce)"}
                </span>
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">{formatPrice(item.order.limitPx)}</td>
              <td className="py-2 px-2 text-right font-mono text-white">{formatSize(item.order.origSz)}</td>
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
        {activeTab === "funding" && <FundingTab />}
        {activeTab === "history" && <OrderHistoryTab coin={coin} />}
      </div>
    </div>
  );
};
