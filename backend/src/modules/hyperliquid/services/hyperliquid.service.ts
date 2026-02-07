import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as hl from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';
import { HyperliquidWalletsService } from '../../hyperliquid-wallets/services/hyperliquid-wallets.service';
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
export class HyperliquidService {
  private readonly logger = new Logger(HyperliquidService.name);
  private readonly infoClient: hl.InfoClient;
  private readonly isTestnet: boolean;

  constructor(
    private configService: ConfigService,
    private walletsService: HyperliquidWalletsService,
  ) {
    this.isTestnet = this.configService.get<string>('HYPERLIQUID_NETWORK', 'testnet') === 'testnet';
    const transport = new hl.HttpTransport({ isTestnet: this.isTestnet });
    this.infoClient = new hl.InfoClient({ transport });
  }

  // ==================== HELPERS ====================

  private async createExchangeClient(userId: string): Promise<hl.ExchangeClient> {
    const privateKey = await this.walletsService.getAgentPrivateKey(userId);
    const wallet = privateKeyToAccount(privateKey);
    const transport = new hl.HttpTransport({ isTestnet: this.isTestnet });
    return new hl.ExchangeClient({ wallet, transport });
  }

  private async getMasterAddress(userId: string): Promise<`0x${string}`> {
    const wallet = await this.walletsService.getWallet(userId);
    if (!wallet) throw new BadRequestException('No agent wallet found');
    return wallet.masterAddress as `0x${string}`;
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

  private roundToDecimals(value: string | number, decimals: number): string {
    const num = Number(value);
    if (isNaN(num)) throw new BadRequestException('Invalid number for rounding');
    const factor = Math.pow(10, decimals);
    return (Math.floor(num * factor) / factor).toFixed(decimals);
  }

  private async validateAndFormatOrder(
    assetNumber: number,
    size: string,
    price?: string,
  ): Promise<{ formattedSize: string; formattedPrice?: string; assetInfo: any }> {
    const assetInfo = await this.getAssetMetadata(assetNumber);
    const formattedSize = this.roundToDecimals(size, assetInfo.szDecimals);

    let formattedPrice: string | undefined;
    if (price !== undefined) {
      // Detect price decimals based on asset
      const priceDecimals = await this.detectPriceDecimals(assetInfo.name);
      formattedPrice = this.roundToDecimals(price, priceDecimals);
    }

    return { formattedSize, formattedPrice, assetInfo };
  }

  private async detectPriceDecimals(coin: string): Promise<number> {
    try {
      const mids = await this.infoClient.allMids();
      const price = mids[coin];
      if (!price) return 4; // default

      const priceNum = Number(price);
      if (priceNum >= 10000) return 1;
      if (priceNum >= 1000) return 2;
      if (priceNum >= 100) return 3;
      if (priceNum >= 10) return 4;
      if (priceNum >= 1) return 5;
      return 6;
    } catch {
      return 4;
    }
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

  async getAccountSummary(userId: string) {
    const address = await this.getMasterAddress(userId);
    const state = await this.infoClient.clearinghouseState({ user: address });
    return { success: true, account: state };
  }

  async getPositions(userId: string) {
    const address = await this.getMasterAddress(userId);
    const state = await this.infoClient.clearinghouseState({ user: address });
    return {
      success: true,
      positions: state.assetPositions || [],
    };
  }

  async getPositionForCoin(userId: string, coin: string) {
    const positions = await this.getPositions(userId);
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
  }

  async getOpenOrders(userId: string) {
    const address = await this.getMasterAddress(userId);
    const orders = await this.infoClient.openOrders({ user: address });
    return { success: true, orders: orders || [] };
  }

  // ==================== OPEN POSITION ORDERS ====================

  async openLimitOrder(userId: string, order: OpenLimitOrderDto) {
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize, formattedPrice } = await this.validateAndFormatOrder(asset, order.size, order.price);

    const tif: 'Gtc' | 'Ioc' | 'Alo' = order.postOnly ? 'Alo' : 'Gtc';
    const result = await exchange.order({
      orders: [{ a: asset, b: order.isBuy, p: formattedPrice!, s: formattedSize, r: false, t: { limit: { tif } } }],
      grouping: 'na',
    });

    if (result?.status === 'ok') {
      return { success: true, data: result.response?.data, message: 'Limit order placed (opening position)' };
    }
    throw new BadRequestException(`Order failed: ${JSON.stringify(result?.response)}`);
  }

  async openMarketOrder(userId: string, order: OpenMarketOrderDto) {
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize } = await this.validateAndFormatOrder(asset, order.size);

    const result = await exchange.order({
      orders: [{ a: asset, b: order.isBuy, p: '0', s: formattedSize, r: false, t: { limit: { tif: 'FrontendMarket' } } }],
      grouping: 'na',
    });

    if (result?.status === 'ok') {
      return { success: true, data: result.response?.data, message: 'Market order executed (opening position)' };
    }
    throw new BadRequestException(`Order failed: ${JSON.stringify(result?.response)}`);
  }

  // ==================== CLOSE POSITION ORDERS ====================

  async closeLimitOrder(userId: string, order: CloseLimitOrderDto) {
    // Get current position to determine direction
    const posResult = await this.getPositionForCoin(userId, order.coin);
    if (!posResult.position || posResult.position.side === 'NONE') {
      throw new BadRequestException(`No open position for ${order.coin}`);
    }

    const position = posResult.position;
    const closeSize = Number(order.size);
    if (closeSize > position.size) {
      throw new BadRequestException(`Cannot close ${order.size}, position size is only ${position.size}`);
    }

    const isBuy = position.isShort; // opposite direction
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize, formattedPrice } = await this.validateAndFormatOrder(asset, order.size, order.price);

    const tif: 'Gtc' | 'Ioc' | 'Alo' = order.postOnly ? 'Alo' : 'Gtc';
    const result = await exchange.order({
      orders: [{ a: asset, b: isBuy, p: formattedPrice!, s: formattedSize, r: true, t: { limit: { tif } } }],
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
  }

  async closeMarketOrder(userId: string, order: CloseMarketOrderDto) {
    // Get current position
    const posResult = await this.getPositionForCoin(userId, order.coin);
    if (!posResult.position || posResult.position.side === 'NONE') {
      throw new BadRequestException(`No open position for ${order.coin}`);
    }

    const position = posResult.position;
    const closeSize = Number(order.size);
    if (closeSize > position.size) {
      throw new BadRequestException(`Cannot close ${order.size}, position size is only ${position.size}`);
    }

    const isBuy = position.isShort; // opposite direction
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize } = await this.validateAndFormatOrder(asset, order.size);

    const result = await exchange.order({
      orders: [{ a: asset, b: isBuy, p: '0', s: formattedSize, r: true, t: { limit: { tif: 'FrontendMarket' } } }],
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
  }

  // ==================== TP/SL ORDERS ====================

  private async cancelExistingTpSlOrders(userId: string, coin: string, type: 'tp' | 'sl') {
    try {
      const openOrders = await this.getOpenOrders(userId);
      if (!openOrders.success || !openOrders.orders.length) return 0;

      const exchange = await this.createExchangeClient(userId);
      const asset = await this.getAssetNumberByCoin(coin);
      const posResult = await this.getPositionForCoin(userId, coin);
      const mids = await this.infoClient.allMids();
      const currentPrice = Number(mids[coin] || 0);

      let cancelled = 0;
      for (const order of openOrders.orders) {
        if (order.coin !== coin || !order.reduceOnly) continue;

        const orderPrice = Number(order.limitPx);
        let shouldCancel = false;

        if (posResult.position?.isLong) {
          // LONG: TP > market, SL < market
          shouldCancel = type === 'tp' ? orderPrice > currentPrice : orderPrice < currentPrice;
        } else if (posResult.position?.isShort) {
          // SHORT: TP < market, SL > market
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

  async placeTakeProfitOrder(userId: string, order: TakeProfitOrderDto) {
    const cancelledCount = await this.cancelExistingTpSlOrders(userId, order.coin, 'tp');

    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize, formattedPrice: execPrice } = await this.validateAndFormatOrder(asset, order.size, order.takeProfitPrice);
    const triggerPrice = this.roundToDecimals(order.takeProfitTrigger, await this.detectPriceDecimals(order.coin));

    const result = await exchange.order({
      orders: [{
        a: asset,
        b: !order.isBuy, // opposite direction
        p: execPrice!,
        s: formattedSize,
        r: true, // reduce-only
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
  }

  async placeStopLossOrder(userId: string, order: StopLossOrderDto) {
    const cancelledCount = await this.cancelExistingTpSlOrders(userId, order.coin, 'sl');

    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(order.coin);
    const { formattedSize, formattedPrice: execPrice } = await this.validateAndFormatOrder(asset, order.size, order.stopLossPrice);
    const triggerPrice = this.roundToDecimals(order.stopLossTrigger, await this.detectPriceDecimals(order.coin));

    const result = await exchange.order({
      orders: [{
        a: asset,
        b: !order.isBuy, // opposite direction
        p: execPrice!,
        s: formattedSize,
        r: true, // reduce-only
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
  }

  // ==================== CANCEL ORDERS ====================

  async cancelOrder(userId: string, cancel: CancelOrderDto) {
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(cancel.coin);

    const result = await exchange.cancel({
      cancels: [{ a: asset, o: cancel.oid }],
    });

    if (result?.status === 'ok') {
      return { success: true, message: 'Order cancelled', oid: cancel.oid };
    }
    throw new BadRequestException(`Cancel failed: ${JSON.stringify(result?.response)}`);
  }

  async cancelAllOrders(userId: string) {
    const openOrders = await this.getOpenOrders(userId);
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
  }

  // ==================== CLOSE ALL POSITIONS ====================

  async closeAllPositions(userId: string, closeType: CloseAllType) {
    const positions = await this.getPositions(userId);
    if (!positions.success || !positions.positions.length) {
      return { success: true, message: 'No positions to close', closedCount: 0 };
    }

    const closed: any[] = [];
    const failed: any[] = [];

    // Get mid prices if needed
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
          result = await this.closeMarketOrder(userId, { coin, size: String(size) });
        } else {
          const midPrice = mids[coin];
          if (!midPrice) throw new BadRequestException(`No mid price for ${coin}`);
          result = await this.closeLimitOrder(userId, { coin, price: midPrice, size: String(size) });
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
  }

  // ==================== LEVERAGE & MARGIN ====================

  async updateLeverage(userId: string, dto: UpdateLeverageDto) {
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
  }

  async setIsolatedMode(userId: string, dto: SetIsolatedModeDto) {
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
  }

  // ==================== TWAP (Simplified) ====================

  async twap(userId: string, twap: TwapDto) {
    // Simple TWAP implementation - executes slices sequentially
    const exchange = await this.createExchangeClient(userId);
    const asset = await this.getAssetNumberByCoin(twap.coin);

    const totalSlices = Math.floor(twap.durationSeconds / twap.frequencySeconds);
    if (totalSlices < 1) throw new BadRequestException('Duration too short for frequency');

    const sliceSize = Number(twap.size) / totalSlices;
    const { formattedSize } = await this.validateAndFormatOrder(asset, String(sliceSize));

    this.logger.log(`Starting TWAP: ${totalSlices} slices of ${formattedSize} ${twap.coin}`);

    // Return immediately with job info - actual execution would be async
    // For now, this is a simplified version that just returns the plan
    return {
      success: true,
      message: 'TWAP plan created',
      plan: {
        coin: twap.coin,
        isBuy: twap.isBuy,
        totalSize: twap.size,
        sliceSize: formattedSize,
        totalSlices,
        frequencySeconds: twap.frequencySeconds,
        durationSeconds: twap.durationSeconds,
      },
      note: 'TWAP execution not implemented in this version. Use individual market orders.',
    };
  }
}
