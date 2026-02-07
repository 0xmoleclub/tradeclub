import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';
import { HyperliquidWalletsService } from '../../hyperliquid-wallets/services/hyperliquid-wallets.service';
import { OrderRequest, Position, OpenOrder, AccountSummary, MarketInfo } from '../types/hyperliquid.types';

@Injectable()
export class HyperliquidService {
  private readonly logger = new Logger(HyperliquidService.name);
  private readonly transport: HttpTransport;
  private readonly infoClient: InfoClient;

  constructor(
    private configService: ConfigService,
    private walletsService: HyperliquidWalletsService,
  ) {
    this.transport = new HttpTransport();
    this.infoClient = new InfoClient({ transport: this.transport });
  }

  private async createExchangeClient(userId: string): Promise<ExchangeClient> {
    const privateKey = await this.walletsService.getAgentPrivateKey(userId);
    const wallet = privateKeyToAccount(privateKey);
    return new ExchangeClient({ transport: this.transport, wallet });
  }

  // ==================== MARKET DATA ====================

  async getMarkets(): Promise<MarketInfo[]> {
    const meta = await this.infoClient.meta();
    return meta.universe as unknown as MarketInfo[];
  }

  async getPrice(coin: string): Promise<string> {
    const mids = await this.infoClient.allMids();
    const price = mids[coin];
    if (!price) throw new BadRequestException(`Price not found for ${coin}`);
    return price;
  }

  // ==================== ACCOUNT ====================

  async getAccountSummary(userId: string): Promise<AccountSummary> {
    const masterAddress = await this.walletsService.getMasterAddress(userId);
    return this.infoClient.clearinghouseState({ user: masterAddress }) as unknown as AccountSummary;
  }

  async getPositions(userId: string): Promise<Position[]> {
    const masterAddress = await this.walletsService.getMasterAddress(userId);
    const state = await this.infoClient.clearinghouseState({ user: masterAddress }) as any;
    return state.assetPositions?.map((ap: any) => ap.position) || [];
  }

  async getOpenOrders(userId: string): Promise<OpenOrder[]> {
    const masterAddress = await this.walletsService.getMasterAddress(userId);
    return this.infoClient.openOrders({ user: masterAddress }) as Promise<OpenOrder[]>;
  }

  // ==================== TRADING ====================

  async placeOrder(userId: string, order: OrderRequest): Promise<any> {
    const meta = await this.infoClient.meta();
    const assetIndex = meta.universe.findIndex((m: any) => m.name === order.coin);
    if (assetIndex === -1) throw new BadRequestException(`Invalid coin: ${order.coin}`);

    const orderObj = {
      a: assetIndex,
      b: order.side === 'LONG',
      p: order.price || '0',
      s: order.size,
      r: order.reduceOnly || false,
      t: this.buildOrderType(order),
    };

    const exchange = await this.createExchangeClient(userId);
    return exchange.order({ orders: [orderObj], grouping: 'na' });
  }

  private buildOrderType(order: OrderRequest): any {
    switch (order.orderType) {
      case 'MARKET':
        return { market: {} };
      case 'LIMIT':
        return { limit: { tif: order.timeInForce || 'Gtc' } };
      case 'STOP_MARKET':
        return { stopMarket: { triggerPx: order.triggerPrice } };
      case 'STOP_LIMIT':
        return { stopLimit: { triggerPx: order.triggerPrice, limitPx: order.price, tif: order.timeInForce || 'Gtc' } };
      default:
        return { limit: { tif: 'Gtc' } };
    }
  }

  async cancelOrder(userId: string, coin: string, orderId: number): Promise<any> {
    const meta = await this.infoClient.meta();
    const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
    if (assetIndex === -1) throw new BadRequestException(`Invalid coin: ${coin}`);

    const exchange = await this.createExchangeClient(userId);
    return exchange.cancelByCloid({
      cancels: [{ asset: assetIndex, cloid: orderId.toString() }],
    });
  }

  async cancelAllOrders(userId: string, coin?: string): Promise<any> {
    const exchange = await this.createExchangeClient(userId);
    const masterAddress = await this.walletsService.getMasterAddress(userId);

    if (coin) {
      const meta = await this.infoClient.meta();
      const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
      if (assetIndex === -1) throw new BadRequestException(`Invalid coin: ${coin}`);
      return exchange.cancel({ cancels: [{ a: assetIndex, o: 0 }] });
    }

    // Cancel all orders across all assets
    const meta = await this.infoClient.meta();
    const openOrders = await this.infoClient.openOrders({ user: masterAddress }) as any[];
    
    const cancels = openOrders.map((order) => {
      const assetIndex = meta.universe.findIndex((m: any) => m.name === order.coin);
      return { a: assetIndex, o: order.oid };
    }).filter(c => c.a !== -1);

    if (cancels.length === 0) return { status: 'success', cancelled: 0 };
    return exchange.cancel({ cancels });
  }

  // ==================== LEVERAGE ====================

  async updateLeverage(userId: string, coin: string, leverage: number, isCross: boolean = true): Promise<any> {
    const meta = await this.infoClient.meta();
    const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
    if (assetIndex === -1) throw new BadRequestException(`Invalid coin: ${coin}`);

    const exchange = await this.createExchangeClient(userId);
    return exchange.updateLeverage({ asset: assetIndex, isCross, leverage });
  }
}
