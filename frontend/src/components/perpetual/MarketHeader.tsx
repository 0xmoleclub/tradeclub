'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Activity, Zap, Clock } from 'lucide-react';

interface MarketInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

interface AssetContext {
  dayNtlVlm: string;
  funding: string;
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

interface MarketData {
  coin: string;
  markPrice: number;
  oraclePrice: number;
  midPrice: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
  change24h: number;
  change24hPercent: number;
  high24h?: number;
  low24h?: number;
  premium: number;
  maxLeverage: number;
}

interface MarketHeaderProps {
  selectedMarket: string;
  onMarketChange: (market: string) => void;
}

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';
const WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws';

export const MarketHeader = ({ selectedMarket, onMarketChange }: MarketHeaderProps) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fundingCountdown, setFundingCountdown] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const currentMarket = markets.find(m => `${m.coin}-PERP` === selectedMarket);

  // Fetch all market data from Hyperliquid
  const fetchMarketData = useCallback(async () => {
    try {
      // Fetch meta and asset contexts
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      });

      if (response.status === 429) {
        console.log('[MarketHeader] Rate limited, skipping this update');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch market data');

      const [meta, assetCtxs] = await response.json();
      
      const marketInfos: MarketInfo[] = meta.universe || [];
      
      const enrichedMarkets: MarketData[] = marketInfos.map((info: MarketInfo, idx: number) => {
        const ctx: AssetContext = assetCtxs[idx] || {};
        const markPrice = parseFloat(ctx.markPx || '0');
        const prevPrice = parseFloat(ctx.prevDayPx || '0');
        const change24h = prevPrice > 0 ? markPrice - prevPrice : 0;
        const change24hPercent = prevPrice > 0 ? (change24h / prevPrice) * 100 : 0;
        
        return {
          coin: info.name,
          markPrice,
          oraclePrice: parseFloat(ctx.oraclePx || '0'),
          midPrice: parseFloat(ctx.midPx || '0'),
          fundingRate: parseFloat(ctx.funding || '0'),
          openInterest: parseFloat(ctx.openInterest || '0') * markPrice, // Convert to USD
          volume24h: parseFloat(ctx.dayNtlVlm || '0'),
          change24h,
          change24hPercent,
          premium: parseFloat(ctx.premium || '0'),
          maxLeverage: info.maxLeverage,
        };
      });

      setMarkets(enrichedMarkets);
      setLoading(false);
    } catch (error) {
      console.error('[MarketHeader] Failed to fetch markets:', error);
      setLoading(false);
    }
  }, []);

  // WebSocket for real-time updates with fallback
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnects = 3;

    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnects) {
        console.log('[MarketHeader] Max reconnection attempts reached, using REST only');
        return;
      }

      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[MarketHeader] WebSocket connected');
          reconnectAttempts = 0;
          ws?.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.channel === 'allMids' && data.data) {
              const mids = data.data.mids || {};
              
              setMarkets(prev => prev.map(m => {
                const newMid = mids[m.coin];
                if (newMid) {
                  const midPrice = parseFloat(newMid);
                  return { ...m, midPrice, markPrice: midPrice };
                }
                return m;
              }));
            }
          } catch (err) {
            console.error('[MarketHeader] WS parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[MarketHeader] WebSocket error:', err);
        };

        ws.onclose = () => {
          reconnectAttempts++;
          if (reconnectAttempts < maxReconnects) {
            setTimeout(connectWebSocket, 3000 * reconnectAttempts);
          }
        };
      } catch (err) {
        console.error('[MarketHeader] Failed to create WebSocket:', err);
      }
    };

    // Initial fetch
    fetchMarketData();
    
    // Poll for updates every 10 seconds (primary data source)
    const interval = setInterval(fetchMarketData, 10000);
    
    // Try WebSocket as enhancement
    connectWebSocket();

    return () => {
      clearInterval(interval);
      if (ws) {
        ws.close();
      }
    };
  }, [fetchMarketData]);

  // Funding countdown timer
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const utcDate = new Date(utc);
      
      // Funding happens every 8 hours at 00:00, 08:00, 16:00 UTC
      const currentHour = utcDate.getUTCHours();
      const nextFundingHour = currentHour < 8 ? 8 : currentHour < 16 ? 16 : 24;
      const hoursUntil = nextFundingHour - currentHour;
      const minutesUntil = 60 - utcDate.getUTCMinutes();
      
      setFundingCountdown(`${hoursUntil}h ${minutesUntil}m`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close dropdown
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

  const handleMarketSelect = (market: MarketData) => {
    onMarketChange(`${market.coin}-PERP`);
    setIsOpen(false);
  };

  const formatPrice = (price: number): string => {
    if (!price || isNaN(price)) return '$0.00';
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatNumber = (value: number): string => {
    if (!value || isNaN(value)) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatFundingRate = (rate: number): string => {
    if (!rate || isNaN(rate)) return '0.0000%';
    const percent = rate * 100;
    return `${percent > 0 ? '+' : ''}${percent.toFixed(4)}%`;
  };

  if (loading) {
    return (
      <div className="w-full h-14 bg-black/40 border border-white/10 rounded-lg flex items-center px-4">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  const priceChangeNum = currentMarket?.change24hPercent || 0;
  const isPositive = priceChangeNum >= 0;
  const fundingRate = currentMarket?.fundingRate || 0;

  return (
    <div className="w-full relative">
      {/* Main Header Bar */}
      <div className="w-full h-14 bg-black/60 border border-white/10 rounded-lg flex items-center gap-4 px-2">
        
        {/* Asset Selector */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-lg border border-white/20 hover:border-cyan-500/50 transition-all"
          >
            <span className="text-lg font-black font-['Rajdhani'] italic text-white">
              {currentMarket?.coin || selectedMarket.split('-')[0]}
              <span className="text-gray-500">-PERP</span>
            </span>
            <span className="text-base font-mono text-cyan-400">
              {formatPrice(currentMarket?.markPrice || 0)}
            </span>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Market Stats */}
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

            {/* Oracle Price */}
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase leading-none">Oracle</span>
              <span className="text-xs font-mono text-white">
                {formatPrice(currentMarket.oraclePrice)}
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Funding Rate with Countdown */}
            <div className="flex items-center gap-1.5">
              <Zap size={12} className={fundingRate > 0 ? 'text-rose-400' : 'text-emerald-400'} />
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-500 uppercase leading-none">Funding</span>
                  <Clock size={9} className="text-gray-600" />
                  <span className="text-[9px] text-gray-600">{fundingCountdown}</span>
                </div>
                <span className={`text-xs font-bold ${fundingRate > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatFundingRate(fundingRate)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Open Interest */}
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-magenta-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase leading-none">Open Interest</span>
                <span className="text-xs font-mono text-white">
                  {formatNumber(currentMarket.openInterest)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10 hidden lg:flex" />

            {/* 24h Volume */}
            <div className="flex-col hidden lg:flex">
              <span className="text-[9px] text-gray-500 uppercase leading-none">Volume 24h</span>
              <span className="text-xs font-mono text-cyan-400">
                {formatNumber(currentMarket.volume24h)}
              </span>
            </div>

            {/* Max Leverage */}
            <div className="flex-col hidden xl:flex">
              <span className="text-[9px] text-gray-500 uppercase leading-none">Max Lev</span>
              <span className="text-xs font-mono text-yellow-500">
                {currentMarket.maxLeverage}x
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[99999]"
          style={{
            top: buttonRef.current?.getBoundingClientRect().bottom || 0 + 4,
            left: buttonRef.current?.getBoundingClientRect().left || 0,
          }}
        >
          <div className="w-96 bg-[#0a0a0a] border border-white/20 rounded-lg shadow-2xl max-h-[80vh] overflow-hidden">
            {/* Dropdown Header */}
            <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Market</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Price / 24h</span>
            </div>

            {/* Markets List */}
            <div className="max-h-96 overflow-y-auto">
              {markets
                .sort((a, b) => b.volume24h - a.volume24h) // Sort by volume
                .map((market) => {
                  const isSelected = `${market.coin}-PERP` === selectedMarket;
                  const changePositive = market.change24hPercent >= 0;
                  
                  return (
                    <div
                      key={market.coin}
                      onClick={() => handleMarketSelect(market)}
                      className={`
                        w-full px-3 py-2.5 flex items-center justify-between cursor-pointer
                        hover:bg-white/5 transition-colors border-b border-white/5
                        ${isSelected ? 'bg-cyan-500/10' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`
                          w-8 h-8 rounded flex items-center justify-center text-[10px] font-black
                          ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}
                        `}>
                          {market.coin.slice(0, 3)}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">
                            {market.coin}
                            <span className="text-gray-500 font-normal text-[10px]">-PERP</span>
                          </div>
                          <div className="text-[9px] text-gray-500">
                            {market.maxLeverage}x • OI: {formatNumber(market.openInterest)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-cyan-400">
                          {formatPrice(market.markPrice)}
                        </div>
                        <div className={`text-[9px] ${changePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {changePositive ? '+' : ''}{market.change24hPercent.toFixed(2)}%
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
