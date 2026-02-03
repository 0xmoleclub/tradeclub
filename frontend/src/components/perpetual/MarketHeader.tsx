'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface MarketData {
  marketIndex: number;
  symbol: string;
  baseAssetSymbol: string;
  markPrice: string;
  oraclePrice: string;
  bidPrice: string;
  askPrice: string;
  volume24h: string;
  openInterest: string;
  openInterestUsd?: string;
  maxLeverage: number;
  fundingRate?: string;
  priceChange24hPercent?: string;
  high24h?: string;
  low24h?: string;
}

interface MarketHeaderProps {
  selectedMarket: string;
  onMarketChange: (market: string) => void;
}

export const MarketHeader = ({ selectedMarket, onMarketChange }: MarketHeaderProps) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentMarket = markets.find(m => `${m.baseAssetSymbol}-PERP` === selectedMarket);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);

  const fetchMarkets = async () => {
    try {
      const response = await fetch('/api/v1/drift/markets');
      const data = await response.json();
      setMarkets(data.data?.markets || data.markets || []);
    } catch (error) {
      console.error('[MarketHeader] Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketSelect = (market: MarketData) => {
    onMarketChange(`${market.baseAssetSymbol}-PERP`);
    setIsOpen(false);
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0.00';
    if (num >= 1000) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (num >= 1) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(6)}`;
  };

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatFundingRate = (rate: string | undefined): string => {
    if (!rate) return '0.0000%';
    const num = parseFloat(rate);
    if (isNaN(num)) return '0.0000%';
    return `${num > 0 ? '+' : ''}${num.toFixed(4)}%`;
  };

  const priceChangeNum = parseFloat(currentMarket?.priceChange24hPercent || '0');
  const isPositive = priceChangeNum >= 0;

  if (loading) {
    return (
      <div className="w-full h-14 bg-black/40 border border-white/10 rounded-lg flex items-center px-4">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Main Header Bar */}
      <div className="w-full h-14 bg-black/60 border border-white/10 rounded-lg flex items-center gap-4 px-2">
        
        {/* Asset Selector - Original Style */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-lg border border-white/20 hover:border-cyan-500/50 transition-all"
          >
            <span className="text-lg font-black font-['Rajdhani'] italic text-white">
              {currentMarket?.baseAssetSymbol || selectedMarket.split('-')[0]}
              <span className="text-gray-500">-PERP</span>
            </span>
            <span className="text-base font-mono text-cyan-400">
              {currentMarket ? formatPrice(currentMarket.markPrice) : '$0'}
            </span>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Market Stats - Compact Horizontal Layout */}
        {currentMarket && (
          <>
            {/* 24h Change */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 uppercase">24h</span>
              <div className={`flex items-center gap-0.5 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{Math.abs(priceChangeNum).toFixed(2)}%</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Funding Rate */}
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase leading-none">Funding</span>
                <span className={`text-xs font-bold ${parseFloat(currentMarket.fundingRate || '0') > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatFundingRate(currentMarket.fundingRate)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Open Interest */}
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-magenta-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase leading-none">OI</span>
                <span className="text-xs font-mono text-white">
                  {formatNumber(currentMarket.openInterestUsd || currentMarket.openInterest)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* 24h Volume */}
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase leading-none">Volume 24h</span>
              <span className="text-xs font-mono text-cyan-400">
                {formatNumber(currentMarket.volume24h)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dropdown - Portal style with pointer-events-auto */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[99999] pointer-events-auto"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
          }}
        >
          <div className="w-80 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-2xl max-h-80 overflow-hidden">
            {/* Dropdown Header */}
            <div className="px-3 py-2 bg-white/5 border-b border-white/10">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Select Market</span>
            </div>

            {/* Markets List */}
            <div className="max-h-64 overflow-y-auto">
              {markets.map((market) => {
                const isSelected = `${market.baseAssetSymbol}-PERP` === selectedMarket;
                
                return (
                  <div
                    key={market.marketIndex}
                    onClick={() => handleMarketSelect(market)}
                    className={`
                      w-full px-3 py-2.5 flex items-center justify-between cursor-pointer
                      hover:bg-white/5 transition-colors border-b border-white/5
                      ${isSelected ? 'bg-cyan-500/10' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-7 h-7 rounded flex items-center justify-center text-[10px] font-black
                        ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}
                      `}>
                        {market.baseAssetSymbol.slice(0, 3)}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">
                          {market.baseAssetSymbol}
                          <span className="text-gray-500 font-normal text-[10px]">-PERP</span>
                        </div>
                        <div className="text-[9px] text-gray-500">
                          {market.maxLeverage}x
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-cyan-400">
                        {formatPrice(market.markPrice)}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        OI: {formatNumber(market.openInterest)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
