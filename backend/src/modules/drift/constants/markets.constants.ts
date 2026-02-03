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

// Drift Perp Markets (Devnet and Mainnet have same indices)
export const DRIFT_PERP_MARKETS: Record<string, MarketConfig> = {
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
  'JTO': {
    symbol: 'JTO',
    marketIndex: 6,
    baseDecimals: 9,
    quoteDecimals: 6,
    name: 'JTO-PERP',
  },
  'JUP': {
    symbol: 'JUP',
    marketIndex: 8,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'JUP-PERP',
  },
  'WIF': {
    symbol: 'WIF',
    marketIndex: 11,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'WIF-PERP',
  },
  'BONK': {
    symbol: 'BONK',
    marketIndex: 12,
    baseDecimals: 5,
    quoteDecimals: 6,
    name: 'BONK-PERP',
  },
  'HNT': {
    symbol: 'HNT',
    marketIndex: 13,
    baseDecimals: 8,
    quoteDecimals: 6,
    name: 'HNT-PERP',
  },
  'PYTH': {
    symbol: 'PYTH',
    marketIndex: 16,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'PYTH-PERP',
  },
  'W': {
    symbol: 'W',
    marketIndex: 20,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'W-PERP',
  },
  'TNSR': {
    symbol: 'TNSR',
    marketIndex: 21,
    baseDecimals: 9,
    quoteDecimals: 6,
    name: 'TNSR-PERP',
  },
  'DRIFT': {
    symbol: 'DRIFT',
    marketIndex: 22,
    baseDecimals: 6,
    quoteDecimals: 6,
    name: 'DRIFT-PERP',
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
