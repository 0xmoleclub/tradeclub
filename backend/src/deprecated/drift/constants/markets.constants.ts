/**
 * Drift Protocol Market Constants
 * Maps token symbols to market indices and decimals
 */

import { BN } from '@coral-xyz/anchor';

export interface MarketConfig {
  symbol: string;
  marketIndex: number;
  baseDecimals: number;  // Decimals for the base asset (e.g., 9 for SOL)
  quoteDecimals: number; // Decimals for the quote asset (USDC = 6)
  name: string;
}

// Drift Perp Markets with correct decimal places
// Based on Drift SDK and token standards
export const DRIFT_PERP_MARKETS: Record<string, MarketConfig> = {
  // Major markets
  'SOL': {
    symbol: 'SOL',
    marketIndex: 0,
    baseDecimals: 9,
    quoteDecimals: 6,
    name: 'SOL-PERP',
  },
  'BTC': {
    symbol: 'BTC',
    marketIndex: 1,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'BTC-PERP',
  },
  'ETH': {
    symbol: 'ETH',
    marketIndex: 2,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'ETH-PERP',
  },
  'APT': {
    symbol: 'APT',
    marketIndex: 3,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'APT-PERP',
  },
  '1MBONK': {
    symbol: '1MBONK',
    marketIndex: 4,
    baseDecimals: 5, // 1M BONK tokens (BONK has 5 decimals)
    quoteDecimals: 6,
    name: '1MBONK-PERP',
  },
  'POL': {
    symbol: 'POL',
    marketIndex: 5,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'POL-PERP',
  },
  'ARB': {
    symbol: 'ARB',
    marketIndex: 6,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'ARB-PERP',
  },
  'DOGE': {
    symbol: 'DOGE',
    marketIndex: 7,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'DOGE-PERP',
  },
  'BNB': {
    symbol: 'BNB',
    marketIndex: 8,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'BNB-PERP',
  },
  'SUI': {
    symbol: 'SUI',
    marketIndex: 9,
    baseDecimals: 9,
    quoteDecimals: 6,
    name: 'SUI-PERP',
  },
  '1MPEPE': {
    symbol: '1MPEPE',
    marketIndex: 10,
    baseDecimals: 6, // 1M PEPE tokens (PEPE has 6 decimals)
    quoteDecimals: 6,
    name: '1MPEPE-PERP',
  },
  'OP': {
    symbol: 'OP',
    marketIndex: 11,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'OP-PERP',
  },
  'RENDER': {
    symbol: 'RENDER',
    marketIndex: 12,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'RENDER-PERP',
  },
  'XRP': {
    symbol: 'XRP',
    marketIndex: 13,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'XRP-PERP',
  },
  'HNT': {
    symbol: 'HNT',
    marketIndex: 14,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'HNT-PERP',
  },
  'INJ': {
    symbol: 'INJ',
    marketIndex: 15,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'INJ-PERP',
  },
  'LINK': {
    symbol: 'LINK',
    marketIndex: 16,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'LINK-PERP',
  },
  'RLB': {
    symbol: 'RLB',
    marketIndex: 17,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'RLB-PERP',
  },
  'PYTH': {
    symbol: 'PYTH',
    marketIndex: 18,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'PYTH-PERP',
  },
  'TIA': {
    symbol: 'TIA',
    marketIndex: 19,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'TIA-PERP',
  },
  'JTO': {
    symbol: 'JTO',
    marketIndex: 20,
    baseDecimals: 9,
    quoteDecimals: 6,
    name: 'JTO-PERP',
  },
  'SEI': {
    symbol: 'SEI',
    marketIndex: 21,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'SEI-PERP',
  },
  'AVAX': {
    symbol: 'AVAX',
    marketIndex: 22,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'AVAX-PERP',
  },
  'W': {
    symbol: 'W',
    marketIndex: 23,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'W-PERP',
  },
  'JUP': {
    symbol: 'JUP',
    marketIndex: 24,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'JUP-PERP',
  },
  'WIF': {
    symbol: 'WIF',
    marketIndex: 25,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'WIF-PERP',
  },
  'BONK': {
    symbol: 'BONK',
    marketIndex: 4, // Same as 1MBONK but with different display
    baseDecimals: 5,
    quoteDecimals: 6,
    name: 'BONK-PERP',
  },
  'KMNO': {
    symbol: 'KMNO',
    marketIndex: 26,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'KMNO-PERP',
  },
  'DRIFT': {
    symbol: 'DRIFT',
    marketIndex: 27,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'DRIFT-PERP',
  },
  '1KWEN': {
    symbol: '1KWEN',
    marketIndex: 28,
    baseDecimals: 5,
    quoteDecimals: 6,
    name: '1KWEN-PERP',
  },
};

/**
 * Get market config by symbol (case-insensitive)
 */
export function getMarketBySymbol(symbol: string): MarketConfig | undefined {
  const normalizedSymbol = symbol.toUpperCase();
  return DRIFT_PERP_MARKETS[normalizedSymbol];
}

/**
 * Get all available market symbols
 */
export function getAvailableSymbols(): string[] {
  return Object.keys(DRIFT_PERP_MARKETS);
}

/**
 * Convert human-readable amount to base units
 * e.g., 1.5 SOL -> 1500000000 (with 9 decimals)
 */
export function toBaseUnits(amount: string | number, decimals: number): string {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  const multiplier = Math.pow(10, decimals);
  const baseUnits = Math.floor(amountNum * multiplier); // Floor to avoid partial units
  return baseUnits.toString();
}

/**
 * Convert base units to human-readable amount
 * e.g., 1500000000 -> 1.5 (with 9 decimals)
 */
export function fromBaseUnits(baseAmount: string | BN, decimals: number): string {
  const base = typeof baseAmount === 'string' ? baseAmount : baseAmount.toString();
  const divisor = Math.pow(10, decimals);
  return (parseFloat(base) / divisor).toString();
}

/**
 * Format price for display (USDC has 6 decimals)
 */
export function formatPrice(price: string | BN): string {
  const priceStr = typeof price === 'string' ? price : price.toString();
  const divisor = Math.pow(10, 6); // USDC decimals
  return (parseFloat(priceStr) / divisor).toFixed(2);
}
