import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as hl from '@nktkas/hyperliquid';
import { ethers } from 'ethers';
import { HypercoreWalletsService } from '../../hypercore-wallets/services/hypercore-wallets.service';
import {
  CancelOrderDto,
  OpenLimitOrderDto,
  OpenMarketOrderDto,
  CloseLimitOrderDto,
  CloseMarketOrderDto,
  TakeProfitOrderDto,
  StopLossOrderDto,
  TwapDto,
  CloseAllType,
  SetIsolatedModeDto,
  UpdateLeverageDto,
} from '../dto';

@Injectable()
export class HypercoreService {
  private readonly logger = new Logger(HypercoreService.name);
  private readonly infoClient: hl.InfoClient;
  private readonly isTestnet: boolean;

  constructor(
    private configService: ConfigService,
    private walletsService: HypercoreWalletsService,
  ) {
    this.isTestnet = this.configService.get<string>('HYPERLIQUID_NETWORK', 'testnet') === 'testnet';
    const transport = new hl.HttpTransport({ isTestnet: this.isTestnet });
    this.infoClient = new hl.InfoClient({ transport });
  }

  // ==================== HELPERS ====================

  private async createExchangeClient(userId: string): Promise<hl.ExchangeClient> {
    const privateKey = await this.walletsService.getAgentPrivateKey(userId);
    const wallet = new ethers.Wallet(privateKey);
    const transport = new hl.HttpTransport({ isTestnet: this.isTestnet });
    return new hl.ExchangeClient({ wallet, transport });
  }

  private async getAssetNumberByCoin(coin: string): Promise<number> {
    const meta = await this.infoClient.meta();
    const index = meta.universe.findIndex((a) => a.name === coin);
    if (index === -1) {
      const available = meta.universe.map((a) => a.name).join(', ');
      throw new BadRequestException(`Coin "${coin}" not found. Available: ${available}`);
    }
    return index;
  }

  private async getAssetMetadata(asset: number) {
    const meta = await this.infoClient.meta();
    const info = meta.universe[asset];
    if (!info) throw new BadRequestException(`Asset ${asset} not found`);
    return {
      name: info.name,
      szDecimals: info.szDecimals,
      maxLeverage: info.maxLeverage,
    };
  }

  /**
   * Round size to szDecimals (from asset metadata)
   */
  private roundToDecimals(value: string | number, decimals: number): string {
    const num = Number(value);
    if (isNaN(num)) throw new BadRequestException('Invalid number for rounding');
    const factor = Math.pow(10, decimals);
    return (Math.floor(num * factor) / factor).toFixed(decimals);
  }

  /**
   * Detect actual price decimals from orderbook - THIS IS THE KEY!
   * Read the actual prices from L2 book to see how many decimals Hyperliquid uses
   */
  private async detectPriceDecimals(coin: string): Promise<number> {
    try {
      const orderbook = await this.infoClient.l2Book({ coin });
      if (!orderbook?.levels) {
        this.logger.warn(`No orderbook data for ${coin}, defaulting to 2 decimals`);
        return 2;
      }
      
      const bids = orderbook.levels[0];
      const asks = orderbook.levels[1];
      
      // Get sample price from orderbook
      const samplePrice = bids?.[0]?.px || asks?.[0]?.px || '0';
      
      // Count decimals in the sample price
      if (!samplePrice.includes('.')) {
        return 0;
      }
      
      const decimals = samplePrice.split('.')[1].length;
      // this.logger.debug(`Detected ${decimals} price decimals for ${coin} from orderbook: ${samplePrice}`);
      return decimals;
    } catch (error) {
      this.logger.warn(`Failed to detect price decimals for ${coin}, defaulting to 2`);
      return 2;
    }
  }

  /**
   * Get tick size from orderbook by looking at price differences between levels
   */
  private async getTickSizeFromOrderbook(coin: string): Promise<number> {
    try {
      const orderbook = await this.infoClient.l2Book({ coin });
      if (!orderbook?.levels) {
        return 0.01; // default fallback
      }
      
      const bids = orderbook.levels[0];
      const asks = orderbook.levels[1];
      
      // Try to find tick size from bid spread
      if (bids && bids.length >= 2) {
        const p1 = Number(bids[0].px);
        const p2 = Number(bids[1].px);
        const diff = Math.abs(p1 - p2);
        if (diff > 0) return diff;
      }
      
      // Try ask spread
      if (asks && asks.length >= 2) {
        const p1 = Number(asks[0].px);
        const p2 = Number(asks[1].px);
        const diff = Math.abs(p1 - p2);
        if (diff > 0) return diff;
      }
      
      // Fallback: derive from decimal places
      const decimals = await this.detectPriceDecimals(coin);
      return Math.pow(10, -decimals);
    } catch (error) {
      this.logger.error(`Failed to get tick size for ${coin}:`, error);
      return 0.01;
    }
  }

  /**
   * Format price to match orderbook precision
   */
  private async formatPrice(price: number, coin: string): Promise<string> {
    const decimals = await this.detectPriceDecimals(coin);
    return price.toFixed(decimals);
  }

  // ==================== MARKET DATA ====================

  async getMarkets() {
    const meta = await this.infoClient.meta();
    return {
      success: true,
      markets: meta.universe,
    };
  }

  async getPrice(coin: string) {
    const mids = await this.infoClient.allMids();
    const price = mids[coin];
    if (!price) throw new BadRequestException(`Price not found for ${coin}`);
    return { success: true, coin, price };
  }

  // ==================== ACCOUNT ====================

  async getAccountSummary(userId: string, walletAddress: `0x${string}`) {
    try {
      const state = await this.infoClient.clearinghouseState({ user: walletAddress });
      return { success: true, account: state };
    } catch (error) {
      this.logger.error(`Failed to get account summary:`, error);
      throw new BadRequestException(`Failed to get account: ${error.message}`);
    }
  }

  async getPositions(userId: string, walletAddress: `0x${string}`) {
    try {
      const state = await this.infoClient.clearinghouseState({ user: walletAddress });
      return {
        success: true,
        positions: state.assetPositions || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get positions:`, error);
      throw new BadRequestException(`Failed to get positions: ${error.message}`);
    }
  }

  async getPositionForCoin(userId: string, walletAddress: `0x${string}`, coin: string) {
    try {
      const positions = await this.getPositions(userId, walletAddress);
      const position = positions.positions.find((p: any) => p?.position?.coin === coin);

      if (!position?.position) {
        return {
          success: true,
          position: null,
          message: `No open position found for ${coin}`,
        };
      }

      const szi = Number(position.position.szi || 0);
      return {
        success: true,
        position: {
          coin,
          size: Math.abs(szi),
          side: szi > 0 ? 'LONG' : szi < 0 ? 'SHORT' : 'NONE',
          isLong: szi > 0,
          isShort: szi < 0,
          raw: position.position,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get position for ${coin}:`, error);
      throw new BadRequestException(`Failed to get position: ${error.message}`);
    }
  }

  async getOpenOrders(userId: string, walletAddress: `0x${string}`) {
    try {
      const orders = await this.infoClient.openOrders({ user: walletAddress });
      return { success: true, orders: orders || [] };
    } catch (error) {
      this.logger.error(`Failed to get open orders:`, error);
      throw new BadRequestException(`Failed to get orders: ${error.message}`);
    }
  }

  // ==================== OPEN POSITION ORDERS ====================

  async openLimitOrder(userId: string, order: OpenLimitOrderDto) {
    try {
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      // Format size to szDecimals
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);
      
      // Format price to match orderbook decimals
      const formattedPrice = await this.formatPrice(Number(order.price), order.coin);

      const tif: 'Gtc' | 'Ioc' | 'Alo' = order.postOnly ? 'Alo' : 'Gtc';
      
      // this.logger.log(`Limit order: ${order.isBuy ? 'BUY' : 'SELL'} ${formattedSize} ${order.coin} @ ${formattedPrice}`);
      
      const result = await exchange.order({
        orders: [{ a: asset, b: order.isBuy, p: formattedPrice, s: formattedSize, r: false, t: { limit: { tif } } }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return { success: true, data: result.response?.data, message: 'Limit order placed' };
      }
      
      this.logger.error(`Order failed:`, result);
      throw new BadRequestException(`Order failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`openLimitOrder error:`, error);
      throw new BadRequestException(`Failed to place limit order: ${error.message}`);
    }
  }

  async openMarketOrder(userId: string, order: OpenMarketOrderDto) {
    try {
      // this.logger.log(`Market order: ${order.isBuy ? 'BUY' : 'SELL'} ${order.size} ${order.coin}`);
      
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      // Format size to szDecimals
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);
      
      // Get current market price
      const mids = await this.infoClient.allMids();
      const currentPrice = Number(mids[order.coin]);
      
      if (!currentPrice) {
        throw new BadRequestException(`Could not get market price for ${order.coin}`);
      }

      // Calculate aggressive price (5% slippage)
      const aggressivePrice = order.isBuy 
        ? currentPrice * 1.05
        : currentPrice * 0.95;

      // Format price to match orderbook decimals
      const formattedPrice = await this.formatPrice(aggressivePrice, order.coin);
      
      // this.logger.log(`Market order: current=${currentPrice}, aggressive=${aggressivePrice}, formatted=${formattedPrice}`);

      const result = await exchange.order({
        orders: [{ 
          a: asset, 
          b: order.isBuy, 
          p: formattedPrice, 
          s: formattedSize, 
          r: false, 
          t: { limit: { tif: 'Ioc' } }
        }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return { 
          success: true, 
          data: result.response?.data, 
          message: 'Market order executed',
          executionPrice: formattedPrice
        };
      }
      
      this.logger.error(`Market order failed:`, JSON.stringify(result, null, 2));
      throw new BadRequestException(`Market order failed: ${JSON.stringify(result?.response || result)}`);
    } catch (error) {
      this.logger.error(`openMarketOrder error:`, error);
      throw new BadRequestException(`Failed to place market order: ${error.message}`);
    }
  }

  // ==================== CLOSE POSITION ORDERS ====================

  async closeLimitOrder(userId: string, walletAddress: `0x${string}`, order: CloseLimitOrderDto) {
    try {
      const posResult = await this.getPositionForCoin(userId, walletAddress, order.coin);
      if (!posResult.position || posResult.position.side === 'NONE') {
        throw new BadRequestException(`No open position for ${order.coin}`);
      }

      const position = posResult.position;
      const closeSize = Number(order.size);
      if (closeSize > position.size) {
        throw new BadRequestException(`Cannot close ${order.size}, position size is only ${position.size}`);
      }

      const isBuy = position.isShort;
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);
      const formattedPrice = await this.formatPrice(Number(order.price), order.coin);

      const tif: 'Gtc' | 'Ioc' | 'Alo' = order.postOnly ? 'Alo' : 'Gtc';
      const result = await exchange.order({
        orders: [{ a: asset, b: isBuy, p: formattedPrice, s: formattedSize, r: true, t: { limit: { tif } } }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return {
          success: true,
          data: result.response?.data,
          message: `Limit order placed (closing ${position.side} position)`,
          positionInfo: { side: position.side, closingSize: formattedSize },
        };
      }
      
      throw new BadRequestException(`Close order failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`closeLimitOrder error:`, error);
      throw new BadRequestException(`Failed to close limit order: ${error.message}`);
    }
  }

  async closeMarketOrder(userId: string, walletAddress: `0x${string}`, order: CloseMarketOrderDto) {
    try {
      const posResult = await this.getPositionForCoin(userId, walletAddress, order.coin);
      if (!posResult.position || posResult.position.side === 'NONE') {
        throw new BadRequestException(`No open position for ${order.coin}`);
      }

      const position = posResult.position;
      const closeSize = Number(order.size);
      if (closeSize > position.size) {
        throw new BadRequestException(`Cannot close ${order.size}, position size is only ${position.size}`);
      }

      const isBuy = position.isShort;
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);

      // Get current market price
      const mids = await this.infoClient.allMids();
      const currentPrice = Number(mids[order.coin]);
      
      if (!currentPrice) {
        throw new BadRequestException(`Could not get market price for ${order.coin}`);
      }

      // Calculate aggressive price
      const aggressivePrice = isBuy 
        ? currentPrice * 1.05
        : currentPrice * 0.95;

      const formattedPrice = await this.formatPrice(aggressivePrice, order.coin);

      const result = await exchange.order({
        orders: [{ 
          a: asset, 
          b: isBuy, 
          p: formattedPrice, 
          s: formattedSize, 
          r: true, 
          t: { limit: { tif: 'Ioc' } }
        }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return {
          success: true,
          data: result.response?.data,
          message: `Market order executed (closing ${position.side} position)`,
          positionInfo: { side: position.side, closingSize: formattedSize },
        };
      }
      
      throw new BadRequestException(`Close order failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`closeMarketOrder error:`, error);
      throw new BadRequestException(`Failed to close market order: ${error.message}`);
    }
  }

  // ==================== TP/SL ORDERS ====================

  private async cancelExistingTpSlOrders(userId: string, walletAddress: `0x${string}`, coin: string, type: 'tp' | 'sl') {
    try {
      const openOrders = await this.getOpenOrders(userId, walletAddress);
      if (!openOrders.success || !openOrders.orders.length) return 0;

      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(coin);
      const posResult = await this.getPositionForCoin(userId, walletAddress, coin);
      const mids = await this.infoClient.allMids();
      const currentPrice = Number(mids[coin] || 0);

      let cancelled = 0;
      for (const order of openOrders.orders) {
        if (order.coin !== coin || !order.reduceOnly) continue;

        const orderPrice = Number(order.limitPx);
        let shouldCancel = false;

        if (posResult.position?.isLong) {
          shouldCancel = type === 'tp' ? orderPrice > currentPrice : orderPrice < currentPrice;
        } else if (posResult.position?.isShort) {
          shouldCancel = type === 'tp' ? orderPrice < currentPrice : orderPrice > currentPrice;
        }

        if (shouldCancel && order.oid) {
          try {
            await exchange.cancel({ cancels: [{ a: asset, o: order.oid }] });
            cancelled++;
          } catch (e) {
            this.logger.warn(`Failed to cancel ${type} order ${order.oid}`);
          }
        }
      }
      return cancelled;
    } catch (e) {
      this.logger.error(`Error cancelling existing ${type} orders:`, e);
      return 0;
    }
  }

  async placeTakeProfitOrder(userId: string, walletAddress: `0x${string}`, order: TakeProfitOrderDto) {
    try {
      const cancelledCount = await this.cancelExistingTpSlOrders(userId, walletAddress, order.coin, 'tp');

      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);
      
      // Format prices to match orderbook
      const execPrice = await this.formatPrice(Number(order.takeProfitPrice), order.coin);
      const triggerPrice = await this.formatPrice(Number(order.takeProfitTrigger), order.coin);

      const result = await exchange.order({
        orders: [{
          a: asset,
          b: !order.isBuy,
          p: execPrice,
          s: formattedSize,
          r: true,
          t: { trigger: { isMarket: true, tpsl: 'tp', triggerPx: triggerPrice } },
        }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return {
          success: true,
          message: `Take Profit placed${cancelledCount > 0 ? ` (cancelled ${cancelledCount} existing)` : ''}`,
          data: result.response?.data,
        };
      }
      
      throw new BadRequestException(`TP order failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`placeTakeProfitOrder error:`, error);
      throw new BadRequestException(`Failed to place TP order: ${error.message}`);
    }
  }

  async placeStopLossOrder(userId: string, walletAddress: `0x${string}`, order: StopLossOrderDto) {
    try {
      const cancelledCount = await this.cancelExistingTpSlOrders(userId, walletAddress, order.coin, 'sl');

      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(order.coin);
      const assetInfo = await this.getAssetMetadata(asset);
      
      const formattedSize = this.roundToDecimals(order.size, assetInfo.szDecimals);
      
      // Format prices to match orderbook
      const execPrice = await this.formatPrice(Number(order.stopLossPrice), order.coin);
      const triggerPrice = await this.formatPrice(Number(order.stopLossTrigger), order.coin);

      const result = await exchange.order({
        orders: [{
          a: asset,
          b: !order.isBuy,
          p: execPrice,
          s: formattedSize,
          r: true,
          t: { trigger: { isMarket: true, tpsl: 'sl', triggerPx: triggerPrice } },
        }],
        grouping: 'na',
      });

      if (result?.status === 'ok') {
        return {
          success: true,
          message: `Stop Loss placed${cancelledCount > 0 ? ` (cancelled ${cancelledCount} existing)` : ''}`,
          data: result.response?.data,
        };
      }
      
      throw new BadRequestException(`SL order failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`placeStopLossOrder error:`, error);
      throw new BadRequestException(`Failed to place SL order: ${error.message}`);
    }
  }

  // ==================== CANCEL ORDERS ====================

  async cancelOrder(userId: string, cancel: CancelOrderDto) {
    try {
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(cancel.coin);

      const result = await exchange.cancel({
        cancels: [{ a: asset, o: cancel.oid }],
      });

      if (result?.status === 'ok') {
        return { success: true, message: 'Order cancelled', oid: cancel.oid };
      }
      
      throw new BadRequestException(`Cancel failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`cancelOrder error:`, error);
      throw new BadRequestException(`Failed to cancel order: ${error.message}`);
    }
  }

  async cancelAllOrders(userId: string, walletAddress: `0x${string}`) {
    try {
      const openOrders = await this.getOpenOrders(userId, walletAddress);
      if (!openOrders.success || !openOrders.orders.length) {
        return { success: true, message: 'No orders to cancel', cancelledCount: 0 };
      }

      const exchange = await this.createExchangeClient(userId);
      const cancels = [];

      for (const order of openOrders.orders) {
        if (order.coin && order.oid) {
          const asset = await this.getAssetNumberByCoin(order.coin);
          cancels.push({ a: asset, o: order.oid });
        }
      }

      if (cancels.length === 0) {
        return { success: true, message: 'No valid orders to cancel', cancelledCount: 0 };
      }

      const result = await exchange.cancel({ cancels });

      if (result?.status === 'ok') {
        return { success: true, message: `Cancelled ${cancels.length} orders`, cancelledCount: cancels.length };
      }
      
      throw new BadRequestException(`Cancel all failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`cancelAllOrders error:`, error);
      throw new BadRequestException(`Failed to cancel all orders: ${error.message}`);
    }
  }

  // ==================== CLOSE ALL POSITIONS ====================

  async closeAllPositions(userId: string, walletAddress: `0x${string}`, closeType: CloseAllType) {
    try {
      const positions = await this.getPositions(userId, walletAddress);
      if (!positions.success || !positions.positions.length) {
        return { success: true, message: 'No positions to close', closedCount: 0 };
      }

      const closed: any[] = [];
      const failed: any[] = [];

      let mids: Record<string, string> = {};
      if (closeType === CloseAllType.LIMIT_CLOSE_AT_MID_PRICE) {
        mids = await this.infoClient.allMids();
      }

      for (const p of positions.positions) {
        try {
          if (!p?.position) continue;
          const pos = p.position;
          const coin = pos.coin;
          const szi = Number(pos.szi || 0);
          const size = Math.abs(szi);

          if (!coin || size === 0) continue;

          let result: any;
          if (closeType === CloseAllType.MARKET_CLOSE) {
            result = await this.closeMarketOrder(userId, walletAddress, { coin, size: String(size) });
          } else {
            const midPrice = mids[coin];
            if (!midPrice) throw new BadRequestException(`No mid price for ${coin}`);
            result = await this.closeLimitOrder(userId, walletAddress, { coin, price: midPrice, size: String(size) });
          }

          if (result?.success) {
            closed.push({ coin, size });
          } else {
            failed.push({ coin, size, error: result });
          }
        } catch (err: any) {
          failed.push({ error: err.message });
        }
      }

      return {
        success: failed.length === 0,
        message: `Closed ${closed.length} positions${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        closedCount: closed.length,
        closed,
        failed,
      };
    } catch (error) {
      this.logger.error(`closeAllPositions error:`, error);
      throw new BadRequestException(`Failed to close all positions: ${error.message}`);
    }
  }

  // ==================== LEVERAGE & MARGIN ====================

  async updateLeverage(userId: string, dto: UpdateLeverageDto) {
    try {
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(dto.coin);
      const assetInfo = await this.getAssetMetadata(asset);

      if (dto.leverage > assetInfo.maxLeverage) {
        throw new BadRequestException(`Max leverage for ${dto.coin} is ${assetInfo.maxLeverage}x`);
      }

      const result = await exchange.updateLeverage({
        asset,
        isCross: false,
        leverage: dto.leverage,
      });

      if (result?.status === 'ok') {
        return { success: true, message: `Leverage set to ${dto.leverage}x (isolated)` };
      }
      
      throw new BadRequestException(`Update leverage failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`updateLeverage error:`, error);
      throw new BadRequestException(`Failed to update leverage: ${error.message}`);
    }
  }

  async setIsolatedMode(userId: string, dto: SetIsolatedModeDto) {
    try {
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(dto.coin);
      const assetInfo = await this.getAssetMetadata(asset);

      const result = await exchange.updateLeverage({
        asset,
        isCross: false,
        leverage: assetInfo.maxLeverage,
      });

      if (result?.status === 'ok') {
        return {
          success: true,
          message: `${dto.coin} set to isolated margin (${assetInfo.maxLeverage}x)`,
        };
      }
      
      throw new BadRequestException(`Set isolated mode failed: ${JSON.stringify(result?.response)}`);
    } catch (error) {
      this.logger.error(`setIsolatedMode error:`, error);
      throw new BadRequestException(`Failed to set isolated mode: ${error.message}`);
    }
  }

  // ==================== TWAP (Simplified) ====================

  async twap(userId: string, twap: TwapDto) {
    try {
      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(twap.coin);

      const totalSlices = Math.floor(twap.durationSeconds / twap.frequencySeconds);
      if (totalSlices < 1) throw new BadRequestException('Duration too short for frequency');

      const assetInfo = await this.getAssetMetadata(asset);
      const sliceSize = Number(twap.size) / totalSlices;
      const formattedSliceSize = this.roundToDecimals(sliceSize, assetInfo.szDecimals);

      // this.logger.log(`TWAP plan: ${totalSlices} slices of ${formattedSliceSize} ${twap.coin}`);

      return {
        success: true,
        message: 'TWAP plan created',
        plan: {
          coin: twap.coin,
          isBuy: twap.isBuy,
          totalSize: twap.size,
          sliceSize: formattedSliceSize,
          totalSlices,
          frequencySeconds: twap.frequencySeconds,
          durationSeconds: twap.durationSeconds,
        },
        note: 'TWAP execution not implemented in this version. Use individual market orders.',
      };
    } catch (error) {
      this.logger.error(`twap error:`, error);
      throw new BadRequestException(`Failed to create TWAP: ${error.message}`);
    }
  }
}
