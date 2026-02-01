import { BN } from '@coral-xyz/anchor';
import { MarketType, OrderType, PositionDirection } from '@drift-labs/sdk';

export interface PlaceOrderParams {
  marketIndex: number;
  direction: PositionDirection;
  baseAssetAmount: BN;
  orderType: OrderType;
  marketType?: MarketType;
  price?: BN;
  triggerPrice?: BN;
  reduceOnly?: boolean;
  postOnly?: boolean;
  auctionDuration?: number;
  auctionStartPrice?: BN;
  auctionEndPrice?: BN;
}

export interface CancelOrderParams {
  orderId: number;
}

export interface ModifyOrderParams {
  orderId: number;
  newBaseAssetAmount?: BN;
  newPrice?: BN;
}

export interface DepositParams {
  amount: string; // USD amount (e.g., "5" for $5)
  reduceOnly?: boolean;
}

export interface WithdrawParams {
  marketIndex: number;
  amount: BN;
  reduceOnly?: boolean;
}

export interface PositionInfo {
  marketIndex: number;
  marketSymbol: string;
  baseAssetAmount: string;
  quoteAssetAmount: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  realizedPnl: string;
  liquidationPrice: string | null;
  leverage: string;
  isLong: boolean;
}

export interface OrderInfo {
  orderId: number;
  marketIndex: number;
  marketSymbol: string;
  orderType: string;
  direction: string;
  baseAssetAmount: string;
  filledBaseAssetAmount: string;
  price: string | null;
  triggerPrice: string | null;
  reduceOnly: boolean;
  postOnly: boolean;
  status: string;
  slot: number;
}

export interface AccountInfo {
  collateral: string;
  freeCollateral: string;
  totalCollateral: string;
  marginRatio: string;
  leverage: string;
  buyingPower: string;
  isLiquidatable: boolean;
  settledPerpPnl: string;
  numberOfSubAccounts: number;
}

export interface MarketInfo {
  marketIndex: number;
  symbol: string;
  baseAssetSymbol: string;
  quoteAssetSymbol: string;
  markPrice: string;
  oraclePrice: string;
  bidPrice: string;
  askPrice: string;
  volume24h: string;
  openInterest: string;
  maxLeverage: number;
  initialMarginRatio: string;
  maintenanceMarginRatio: string;
}
