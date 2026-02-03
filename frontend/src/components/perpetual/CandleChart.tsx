'use client';

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface CandleChartProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

interface MarketData {
  marketIndex: number;
  symbol: string;
  baseAssetSymbol: string;
  markPrice: string;
  oraclePrice: string;
  volume24h: string;
  openInterest: string;
  maxLeverage: number;
}

export const CandleChart = ({ symbol = "BTC-PERP", onSymbolChange }: CandleChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMarket = markets.find(m => `${m.baseAssetSymbol}-PERP` === symbol);

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await fetch('/api/v1/drift/markets');
      const data = await response.json();
      console.log('[CandleChart] Fetched markets:', data);
      setMarkets(data.data?.markets || data.markets || []);
    } catch (error) {
      console.error('[CandleChart] Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Mock Data Generator
    let price = 50000;
    const candles: { open: number; close: number; high: number; low: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const open = price;
      const close = price + (Math.random() - 0.5) * 500;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      candles.push({ open, close, high, low });
      price = close;
    }

    const candleWidth = width / 60;
    const maxPrice = Math.max(...candles.map((c) => c.high));
    const minPrice = Math.min(...candles.map((c) => c.low));
    const priceRange = maxPrice - minPrice;

    // Draw
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = i * candleWidth;
      const isUp = c.close > c.open;
      const color = isUp ? "#06b6d4" : "#d946ef"; // Cyan / Magenta
      const bodyTop = height - ((Math.max(c.open, c.close) - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const bodyBottom = height - ((Math.min(c.open, c.close) - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const wickTop = height - ((c.high - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const wickBottom = height - ((c.low - minPrice) / priceRange) * height * 0.8 - height * 0.1;

      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, wickTop);
      ctx.lineTo(x + candleWidth / 2, wickBottom);
      ctx.stroke();

      // Body
      const h = Math.max(1, bodyBottom - bodyTop);
      ctx.fillRect(x + 2, bodyTop, candleWidth - 4, h);

      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillRect(x + 2, bodyTop, candleWidth - 4, h);
      ctx.shadowBlur = 0;
    });
  }, []);

  return (
    <div className="w-full h-full relative group cursor-crosshair flex flex-col">
      {/* Market Selector Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        {/* Market Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-lg border border-white/20 hover:border-cyan-500/50 transition-all backdrop-blur-sm"
          >
            <span className="text-xl font-black font-['Rajdhani'] italic text-white">
              {currentMarket?.baseAssetSymbol || symbol.split('-')[0]}
              <span className="text-gray-500">-PERP</span>
            </span>
            <span className="text-lg font-mono text-cyan-400">
              {currentMarket ? formatPrice(currentMarket.markPrice) : '$0'}
            </span>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-96 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-2xl shadow-black/50 z-[9999] max-h-96 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="px-4 py-8 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : markets.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No markets available
                </div>
              ) : (
                markets.map((market) => {
                const isSelected = `${market.baseAssetSymbol}-PERP` === symbol;
                
                return (
                  <button
                    key={market.marketIndex}
                    onClick={() => {
                      onSymbolChange?.(`${market.baseAssetSymbol}-PERP`);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-4 py-3 flex items-center justify-between
                      hover:bg-white/5 transition-colors border-b border-white/5
                      ${isSelected ? 'bg-cyan-500/10' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                        ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}
                      `}>
                        {market.baseAssetSymbol.slice(0, 3)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">
                          {market.baseAssetSymbol}
                          <span className="text-gray-500 font-normal">-PERP</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {market.maxLeverage}x • Vol: {formatNumber(market.volume24h)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-cyan-400">
                        {formatPrice(market.markPrice || market.oraclePrice)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        OI: {formatNumber(market.openInterest)}
                      </div>
                    </div>
                  </button>
                );
              }))}
            </div>
          )}
        </div>

        {/* Timeframe Buttons */}
        <div className="flex gap-1">
          {["15m", "1h", "4h", "1D"].map((tf) => (
            <button key={tf} className="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors bg-black/40">
              {tf}
            </button>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Crosshair Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 border-t border-dashed border-white/30" />
        <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white/20 border-l border-dashed border-white/30" />
      </div>
    </div>
  );
};
