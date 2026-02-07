/**
 * Hyperliquid Order Types
 */

export type OrderSide = 'LONG' | 'SHORT';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';

export type TimeInForce = 'Gtc' | 'Ioc' | 'Alo'; // Good till cancel, Immediate or cancel, Add liquidity only

export interface OrderRequest {
  coin: string; // e.g., 'BTC', 'ETH'
  side: OrderSide;
  size: string; // Position size
  price?: string; // Limit price (optional for market orders)
  orderType: OrderType;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  triggerPrice?: string; // For stop orders
}

export interface CancelOrderRequest {
  coin: string;
  orderId: number;
}

export interface Position {
  coin: string;
  entryPx: string;
  leverage: string;
  liquidationPx: string;
  marginUsed: string;
  positionValue: string;
  returnOnEquity: string;
  szi: string; // Size (negative for short)
  unrealizedPnl: string;
}

export interface OpenOrder {
  coin: string;
  limitPx: string;
  oid: number; // Order ID
  side: 'A' | 'B'; // A = Ask (sell/short), B = Bid (buy/long)
  sz: string; // Size
  timestamp: number;
}

export interface AccountSummary {
  accountValue: string;
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable: string;
}

export interface MarketInfo {
  coin: string;
  maxLeverage: number;
  name: string;
  szDecimals: number;
}
