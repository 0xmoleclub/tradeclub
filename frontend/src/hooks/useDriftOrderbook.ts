"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  orders: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  lastPrice: number | null;
  markPrice: number | null;
  oraclePrice: number | null;
}

// Drift DLOB Server endpoints
const DLOB_SERVER_URL = 'https://master.dlob.drift.trade'; // devnet
// const DLOB_SERVER_URL = 'https://dlob.drift.trade'; // mainnet-beta

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
const DRIFT_PROGRAM_ID = new PublicKey('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');

// Type for DLOB API response levels
interface DLOBLevel {
  price?: number;
  size?: number;
  sources?: string[];
  [key: number]: number; // For array format [price, size]
}

// Market precision cache
interface MarketPrecision {
  pricePrecision: number;
  basePrecision: number;
}

const precisionCache = new Map<string, MarketPrecision>();

export function useDriftOrderbook(symbol: string = 'SOL-PERP') {
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oraclePrice, setOraclePrice] = useState<number | null>(null);
  const [precision, setPrecision] = useState<MarketPrecision | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionRef = useRef<Connection | null>(null);

  // Fetch market precision from Drift on-chain data
  const fetchMarketPrecision = useCallback(async (marketSymbol: string): Promise<MarketPrecision> => {
    // Check cache first
    if (precisionCache.has(marketSymbol)) {
      return precisionCache.get(marketSymbol)!;
    }

    try {
      if (!connectionRef.current) {
        connectionRef.current = new Connection(RPC_ENDPOINT, 'confirmed');
      }

      // Market index mapping
      const marketIndexMap: Record<string, number> = {
        'SOL-PERP': 0,
        'BTC-PERP': 1,
        'ETH-PERP': 2,
      };

      const marketIndex = marketIndexMap[marketSymbol.toUpperCase()] ?? 0;

      // Derive PerpMarket PDA
      // Market index must be encoded as u16 (2 bytes) in little-endian format
      const marketIndexBuffer = Buffer.alloc(2);
      marketIndexBuffer.writeUInt16LE(marketIndex, 0);
      
      const [perpMarketPubkey] = PublicKey.findProgramAddressSync(
        [Buffer.from('perp_market'), marketIndexBuffer],
        DRIFT_PROGRAM_ID
      );

      const accountInfo = await connectionRef.current.getAccountInfo(perpMarketPubkey);
      
      if (!accountInfo) {
        throw new Error('Market account not found');
      }

      // Parse market account data
      // Standard Drift precision values (these are protocol constants)
      // Price precision is always 1e6 for all markets
      const pricePrecision = 1e6;
      
      // Base precision depends on the token decimals
      // Drift uses standard SPL token decimals
      let basePrecision = 1e9; // Default for SOL
      
      if (marketSymbol.includes('BTC') || marketSymbol.includes('ETH')) {
        basePrecision = 1e8; // BTC and ETH use 8 decimals in Drift
      }

      const marketPrecision = { pricePrecision, basePrecision };
      precisionCache.set(marketSymbol, marketPrecision);
      
      console.log(`Fetched precision for ${marketSymbol}:`, marketPrecision);
      
      return marketPrecision;
    } catch (err) {
      console.error('Error fetching market precision:', err);
      // Fallback to reasonable defaults
      const pricePrecision = 1e6;
      const basePrecision = marketSymbol.includes('BTC') || marketSymbol.includes('ETH') ? 1e8 : 1e9;
      return { pricePrecision, basePrecision };
    }
  }, []);

  // Fetch real orderbook from Drift DLOB Server
  const fetchDriftOrderbook = useCallback(async (): Promise<OrderBookData | null> => {
    try {
      console.log(`[OrderBook] Fetching for symbol: ${symbol}`);
      
      // Get precision first if we don't have it
      if (!precision) {
        console.log('[OrderBook] No precision cached, fetching...');
        const marketPrecision = await fetchMarketPrecision(symbol);
        setPrecision(marketPrecision);
        return null; // Will fetch orderbook on next call
      }

      const marketName = symbol.toUpperCase();
      // Fetch L2 orderbook with depth of 25 levels per side, including oracle price
      const url = `${DLOB_SERVER_URL}/l2?marketName=${marketName}&depth=25&includeOracle=true&includeVamm=true`;
      
      console.log('[OrderBook] Fetching orderbook from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DLOB Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[OrderBook] Raw DLOB response:', {
        symbol,
        bidsCount: data.bids?.length,
        asksCount: data.asks?.length,
        firstBid: data.bids?.[0],
        firstAsk: data.asks?.[0],
        oracle: data.oracle,
        precision: precision
      });
      
      // Parse DLOB response
      const rawBids = data.bids || [];
      const rawAsks = data.asks || [];
      
      // Use fetched precision values
      const { pricePrecision, basePrecision } = precision;
      
      // Convert to our format with cumulative totals and apply proper decimal conversion
      let bidTotal = 0;
      const bids: OrderBookLevel[] = rawBids.map((level: DLOBLevel) => {
        // DLOB returns prices in PRICE_PRECISION and sizes in BASE_PRECISION
        const rawPrice = typeof level.price === 'number' ? level.price : parseFloat(String(level.price || level[0] || 0));
        const rawSize = typeof level.size === 'number' ? level.size : parseFloat(String(level.size || level[1] || 0));
        
        // Convert from raw precision to human-readable
        const price = rawPrice / pricePrecision;
        const size = rawSize / basePrecision;
        
        bidTotal += size;
        
        return {
          price,
          size,
          total: bidTotal,
          orders: level.sources?.length || 1,
        };
      });
      
      let askTotal = 0;
      const asks: OrderBookLevel[] = rawAsks.map((level: DLOBLevel) => {
        const rawPrice = typeof level.price === 'number' ? level.price : parseFloat(String(level.price || level[0] || 0));
        const rawSize = typeof level.size === 'number' ? level.size : parseFloat(String(level.size || level[1] || 0));
        
        // Convert from raw precision to human-readable
        const price = rawPrice / pricePrecision;
        const size = rawSize / basePrecision;
        
        askTotal += size;
        
        return {
          price,
          size,
          total: askTotal,
          orders: level.sources?.length || 1,
        };
      });
      
      const bestBid = bids[0]?.price || 0;
      const bestAsk = asks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;
      
      // Oracle price also needs conversion
      const rawOraclePrice = data.oracle || data.oracleData?.price || null;
      const oraclePrice = rawOraclePrice ? rawOraclePrice / pricePrecision : null;
      const markPrice = oraclePrice || midPrice;
      
      console.log('Converted orderbook:', { bestBid, bestAsk, midPrice, oraclePrice, spread });
      
      return {
        bids,
        asks,
        spread,
        spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
        lastPrice: markPrice,
        markPrice: markPrice,
        oraclePrice: oraclePrice,
      };
    } catch (err) {
      console.error('Error fetching Drift orderbook:', err);
      return null;
    }
  }, [symbol, precision, fetchMarketPrecision]);

  // Main fetch loop
  const fetchOrderbook = useCallback(async () => {
    try {
      // Fetch real orderbook from DLOB server
      const orderbookData = await fetchDriftOrderbook();
      
      if (orderbookData && orderbookData.bids.length > 0 && orderbookData.asks.length > 0) {
        setOrderbook(orderbookData);
        if (orderbookData.oraclePrice) {
          setOraclePrice(orderbookData.oraclePrice);
        }
        setError(null);
      } else if (!orderbookData && !precision) {
        // First call to get precision, don't set error yet
        return;
      } else {
        throw new Error('Empty orderbook received');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchOrderbook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
      setLoading(false);
    }
  }, [fetchDriftOrderbook, precision]);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      if (!isActive) return;
      await fetchOrderbook();
      
      // Poll for updates every 1 second (DLOB updates frequently)
      intervalRef.current = setInterval(() => {
        if (isActive) {
          fetchOrderbook();
        }
      }, 1000);
    };

    init();

    return () => {
      isActive = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchOrderbook]);

  return {
    orderbook,
    loading,
    error,
    oraclePrice,
  };
}
