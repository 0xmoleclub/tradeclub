'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

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

interface MarketSelectorProps {
  selectedMarket: string;
  onMarketChange: (market: string) => void;
}

export const MarketSelector = ({ selectedMarket, onMarketChange }: MarketSelectorProps) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMarket = markets.find(m => `${m.baseAssetSymbol}-PERP` === selectedMarket);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/drift/markets`);
      const data = await response.json();
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: string | number, decimals: number = 2): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0';
    if (num >= 1000) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (num >= 1) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(6)}`;
  };

  if (loading) {
    return (
      <div className="mb-2 -mx-2 px-2 py-4 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mb-2 -mx-2 px-2">
      <div className="flex items-center gap-4 bg-[#0a0a0a] border-b border-white/5 pb-3">
        {/* Market Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-white/20 rounded-lg hover:border-cyan-500/50 transition-all group"
          >
            <span className="text-lg font-black uppercase tracking-wide text-white">
              {currentMarket?.baseAssetSymbol || 'BTC'}
              <span className="text-gray-500">-PERP</span>
            </span>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto custom-scrollbar">
              {markets.map((market) => {
                const isSelected = `${market.baseAssetSymbol}-PERP` === selectedMarket;
                const price = parseFloat(market.markPrice) || parseFloat(market.oraclePrice);
                
                return (
                  <button
                    key={market.marketIndex}
                    onClick={() => {
                      onMarketChange(`${market.baseAssetSymbol}-PERP`);
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
                          {market.maxLeverage}x
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-cyan-400">
                        {formatPrice(market.markPrice || market.oraclePrice)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Vol: {formatNumber(market.volume24h)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Market Info */}
        {currentMarket && (
          <>
            <div className="flex-1 flex items-center gap-6">
              {/* Mark Price */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mark</div>
                <div className="text-2xl font-black text-cyan-400">
                  {formatPrice(currentMarket.markPrice)}
                </div>
              </div>

              {/* Oracle Price */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Oracle</div>
                <div className="text-sm font-mono text-gray-300">
                  {formatPrice(currentMarket.oraclePrice)}
                </div>
              </div>

              {/* 24h Volume */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">24h Volume</div>
                <div className="text-sm font-mono text-gray-300">
                  {formatNumber(currentMarket.volume24h)}
                </div>
              </div>

              {/* Open Interest */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Open Interest</div>
                <div className="text-sm font-mono text-gray-300">
                  {formatNumber(currentMarket.openInterest)}
                </div>
              </div>

              {/* Max Leverage */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Max Leverage</div>
                <div className="text-sm font-bold text-magenta-400">
                  {currentMarket.maxLeverage}x
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
