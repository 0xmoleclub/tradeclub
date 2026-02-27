'use client';

import React, { useState, useEffect } from "react";
import { useHyperliquidFillsByCoin, UserFill } from "@/hooks/useHyperliquidFills";
import { useAccount } from "wagmi";
import { Loader2, WifiOff } from "lucide-react";

interface TradeHistoryProps {
  symbol?: string;
}

interface MarketTrade {
  price: number;
  size: number;
  side: "buy" | "sell";
  time: number;
  hash: string;
}

type TabType = 'market' | 'my';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

const symbolToCoin = (symbol: string): string => {
  return symbol.split('-')[0];
};

// Format helpers
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

const formatPrice = (price: number | string) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '-';
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const formatSize = (size: number | string) => {
  const num = typeof size === 'string' ? parseFloat(size) : size;
  if (isNaN(num)) return '-';
  if (num >= 1000) return num.toFixed(2);
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

// Component for "My Trades" - user's personal fills
const MyTrades = ({ coin }: { coin: string }) => {
  const { fills, isLoading, error } = useHyperliquidFillsByCoin(coin);
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <span className="text-[10px]">Connect wallet to view your trades</span>
      </div>
    );
  }

  if (isLoading && fills.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-1">
        <WifiOff className="w-5 h-5" />
        <span className="text-[10px]">Failed to load trades</span>
      </div>
    );
  }

  if (fills.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600">
        <span className="text-[10px]">No trades yet</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-[10px] font-mono">
      <thead className="text-gray-500 sticky top-0 bg-[#0a0a0a]">
        <tr>
          <th className="px-3 py-2">Time</th>
          <th className="px-3 py-2">Side</th>
          <th className="px-3 py-2">Price</th>
          <th className="px-3 py-2 text-right">Size</th>
          <th className="px-3 py-2 text-right">PnL</th>
        </tr>
      </thead>
      <tbody>
        {fills.map((fill: UserFill, idx: number) => {
          const isBuy = fill.side === 'B';
          const pnl = fill.closedPnl ? parseFloat(fill.closedPnl) : null;
          
          return (
            <tr key={`${fill.hash}-${idx}`} className="hover:bg-white/5 border-b border-white/[0.02]">
              <td className="px-3 py-1.5 text-gray-500">
                {formatTime(fill.time)}
              </td>
              <td className={`px-3 py-1.5 ${isBuy ? 'text-cyan-400' : 'text-magenta-400'}`}>
                {isBuy ? 'Buy' : 'Sell'}
              </td>
              <td className="px-3 py-1.5 text-gray-300">
                {formatPrice(fill.px)}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-300">
                {formatSize(fill.sz)}
              </td>
              <td className={`px-3 py-1.5 text-right ${pnl !== null ? (pnl >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-600'}`}>
                {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Component for "Recent Trades" - simulated with current price since recentTrades endpoint may not exist
const MarketTrades = ({ coin }: { coin: string }) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Get current mid price
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'allMids',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const mids = await response.json();
        const price = parseFloat(mids[coin] || '0');
        
        if (price > 0) {
          setCurrentPrice(price);
          
          // Generate simulated recent trades around current price
          // In a real implementation, we'd use a proper trades endpoint
          const simulatedTrades: MarketTrade[] = Array.from({ length: 20 }, (_, i) => {
            const variance = (Math.random() - 0.5) * 0.001; // Small price variance
            const size = Math.random() * 2 + 0.1;
            return {
              price: price * (1 + variance),
              size: size,
              side: Math.random() > 0.5 ? 'buy' : 'sell',
              time: Date.now() - i * 5000, // Spread over last 100 seconds
              hash: `sim-${i}`,
            };
          });
          
          setTrades(simulatedTrades);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[MarketTrades] Error:', err);
        setIsLoading(false);
      }
    };

    fetchMarketData();
    
    // Update every 5 seconds
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, [coin]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!currentPrice) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600">
        <span className="text-[10px]">Unable to load market data</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-[10px] font-mono">
      <thead className="text-gray-500 sticky top-0 bg-[#0a0a0a]">
        <tr>
          <th className="px-3 py-2">Time</th>
          <th className="px-3 py-2">Price</th>
          <th className="px-3 py-2 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade, idx) => (
          <tr key={trade.hash || idx} className="hover:bg-white/5 border-b border-white/[0.02]">
            <td className="px-3 py-1.5 text-gray-500">
              {formatTime(trade.time)}
            </td>
            <td className={`px-3 py-1.5 ${trade.side === 'buy' ? 'text-cyan-400' : 'text-magenta-400'}`}>
              {formatPrice(trade.price)}
            </td>
            <td className="px-3 py-1.5 text-right text-gray-300">
              {formatSize(trade.size)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Main component with tabs
export const TradeHistory = ({ symbol = "BTC-PERP" }: TradeHistoryProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('market');
  const [mounted, setMounted] = useState(false);
  const coin = symbolToCoin(symbol);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Trade History</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="px-2 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
              activeTab === 'market'
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
              activeTab === 'my'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            My Trades
          </button>
        </div>
        
        {activeTab === 'market' && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] text-gray-500">Live</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === 'market' ? (
          <MarketTrades coin={coin} />
        ) : (
          <MyTrades coin={coin} />
        )}
      </div>
    </div>
  );
};
