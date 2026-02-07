import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';
import { HyperliquidWalletsService } from '../../hyperliquid-wallets/services/hyperliquid-wallets.service';
import { OrderRequest, Position, OpenOrder, AccountSummary, MarketInfo } from '../types/hyperliquid.types';

/**
 * Service for Hyperliquid Protocol integration
 * Handles trading operations, market data, and account management
 */
@Injectable()
export class HyperliquidService {
  private readonly logger = new Logger(HyperliquidService.name);
  private readonly transport: HttpTransport;
  private readonly infoClient: InfoClient;
  private readonly isTestnet: boolean;

  constructor(
    private configService: ConfigService,
    private walletsService: HyperliquidWalletsService,
  ) {
    this.isTestnet = this.configService.get<string>('HYPERLIQUID_NETWORK', 'testnet') === 'testnet';
    
    this.transport = new HttpTransport();
    this.infoClient = new InfoClient({ transport: this.transport });
    
    this.logger.log(`Hyperliquid service initialized (${this.isTestnet ? 'testnet' : 'mainnet'})`);
  }

  /**
   * Create an ExchangeClient for a specific wallet (for trading operations)
   * This requires decrypting the agent's private key
   */
  private async createExchangeClient(walletId: string): Promise<ExchangeClient> {
    const privateKey = await this.walletsService.getAgentPrivateKey(walletId);
    const wallet = privateKeyToAccount(privateKey);
    
    return new ExchangeClient({
      transport: this.transport,
      wallet,
    });
  }

  /**
   * Get account summary for a user
   * Note: Must pass the master address (user's main wallet), NOT the agent address
   */
  async getAccountSummary(masterAddress: string): Promise<AccountSummary> {
    try {
      // clearinghouseState returns account info for the given address
      const state = await this.infoClient.clearinghouseState({
        user: masterAddress,
      }) as unknown as AccountSummary;
      
      return state;
    } catch (error) {
      this.logger.error(`Failed to get account summary for ${masterAddress}:`, error);
      throw new BadRequestException('Failed to fetch account summary');
    }
  }

  /**
   * Get positions for a user
   */
  async getPositions(masterAddress: string): Promise<Position[]> {
    try {
      const state = await this.infoClient.clearinghouseState({
        user: masterAddress,
      }) as any;
      
      return state.assetPositions?.map((ap: any) => ap.position) || [];
    } catch (error) {
      this.logger.error(`Failed to get positions for ${masterAddress}:`, error);
      throw new BadRequestException('Failed to fetch positions');
    }
  }

  /**
   * Get open orders for a user
   */
  async getOpenOrders(masterAddress: string): Promise<OpenOrder[]> {
    try {
      const orders = await this.infoClient.openOrders({
        user: masterAddress,
      });
      
      return orders as OpenOrder[];
    } catch (error) {
      this.logger.error(`Failed to get open orders for ${masterAddress}:`, error);
      throw new BadRequestException('Failed to fetch open orders');
    }
  }

  /**
   * Get available markets
   */
  async getMarkets(): Promise<MarketInfo[]> {
    try {
      const meta = await this.infoClient.meta();
      return meta.universe as unknown as MarketInfo[];
    } catch (error) {
      this.logger.error('Failed to get markets:', error);
      throw new BadRequestException('Failed to fetch markets');
    }
  }

  /**
   * Get current price for a coin
   */
  async getPrice(coin: string): Promise<string> {
    try {
      const mids = await this.infoClient.allMids();
      const price = mids[coin];
      
      if (!price) {
        throw new NotFoundException(`Price not found for ${coin}`);
      }
      
      return price;
    } catch (error) {
      this.logger.error(`Failed to get price for ${coin}:`, error);
      throw new BadRequestException('Failed to fetch price');
    }
  }

  /**
   * Place an order using agent wallet
   * 
   * Order format:
   * - a: asset index (from meta)
   * - b: isBuy (true/false)
   * - p: price (string)
   * - s: size (string)
   * - r: reduceOnly (true/false)
   * - t: orderType (limit, market, etc.)
   */
  async placeOrder(walletId: string, order: OrderRequest): Promise<any> {
    // Verify wallet is approved
    const wallet = await this.walletsService.getWalletByUserId(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    if (!wallet.isApproved) {
      throw new BadRequestException('Agent wallet is not approved on Hyperliquid');
    }

    try {
      // Get asset index from meta
      const meta = await this.infoClient.meta();
      const assetIndex = meta.universe.findIndex((m: any) => m.name === order.coin);
      
      if (assetIndex === -1) {
        throw new BadRequestException(`Invalid coin: ${order.coin}`);
      }

      // Get next nonce
      const nonce = await this.walletsService.getNextNonce(walletId);

      // Build order object
      const orderObj: any = {
        a: assetIndex,
        b: order.side === 'LONG',
        p: order.price || '0', // Market orders use 0
        s: order.size,
        r: order.reduceOnly || false,
        t: this.buildOrderType(order),
      };

      const exchange = await this.createExchangeClient(walletId);
      
      const result = await exchange.order({
        orders: [orderObj],
        grouping: 'na', // No grouping
      });

      this.logger.log(`Order placed: ${order.coin} ${order.side} ${order.size} @ ${order.price || 'MARKET'}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to place order:', error);
      throw new BadRequestException(`Failed to place order: ${error.message}`);
    }
  }

  /**
   * Build order type object for Hyperliquid
   */
  private buildOrderType(order: OrderRequest): any {
    switch (order.orderType) {
      case 'MARKET':
        return { market: {} };
      case 'LIMIT':
        return { limit: { tif: order.timeInForce || 'Gtc' } };
      case 'STOP_MARKET':
        if (!order.triggerPrice) {
          throw new BadRequestException('Trigger price required for stop orders');
        }
        return { stopMarket: { triggerPx: order.triggerPrice } };
      case 'STOP_LIMIT':
        if (!order.triggerPrice || !order.price) {
          throw new BadRequestException('Trigger price and limit price required for stop-limit orders');
        }
        return { stopLimit: { triggerPx: order.triggerPrice, limitPx: order.price, tif: order.timeInForce || 'Gtc' } };
      default:
        return { limit: { tif: 'Gtc' } };
    }
  }

  /**
   * Cancel an order using agent wallet
   */
  async cancelOrder(walletId: string, coin: string, orderId: number): Promise<any> {
    const wallet = await this.walletsService.getWalletByUserId(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    if (!wallet.isApproved) {
      throw new BadRequestException('Agent wallet is not approved');
    }

    try {
      // Get asset index
      const meta = await this.infoClient.meta();
      const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
      
      if (assetIndex === -1) {
        throw new BadRequestException(`Invalid coin: ${coin}`);
      }

      const exchange = await this.createExchangeClient(walletId);

      // Use cancel with cloid (client order ID)
      const result = await exchange.cancelByCloid({
        cancels: [{
          asset: assetIndex,
          cloid: orderId.toString(),
        }],
      });

      this.logger.log(`Order cancelled: ${coin} #${orderId}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to cancel order:', error);
      throw new BadRequestException(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Cancel all orders for a specific coin
   */
  async cancelAllOrders(walletId: string, coin?: string): Promise<any> {
    const wallet = await this.walletsService.getWalletByUserId(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    if (!wallet.isApproved) {
      throw new BadRequestException('Agent wallet is not approved');
    }

    try {
      const exchange = await this.createExchangeClient(walletId);

      if (coin) {
        // Get asset index
        const meta = await this.infoClient.meta();
        const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
        
        if (assetIndex === -1) {
          throw new BadRequestException(`Invalid coin: ${coin}`);
        }

        // Cancel all orders for specific asset
        const result = await exchange.cancel({
          cancels: [{ a: assetIndex, o: 0 }], // o: 0 means cancel all for this asset
        });

        this.logger.log(`Cancelled all orders for ${coin}`);
        return result;
      } else {
        // Cancel all orders across all assets
        // Get all open orders and cancel them individually
        const meta = await this.infoClient.meta();
        const openOrders = await this.infoClient.openOrders({
          user: wallet.masterAddress,
        });

        const cancels: any[] = [];
        for (const order of openOrders as any[]) {
          const assetIndex = meta.universe.findIndex((m: any) => m.name === order.coin);
          if (assetIndex !== -1) {
            cancels.push({ a: assetIndex, o: order.oid });
          }
        }

        if (cancels.length === 0) {
          return { status: 'success', cancelled: 0 };
        }

        const result = await exchange.cancel({ cancels });
        this.logger.log(`Cancelled ${cancels.length} orders`);
        return result;
      }
    } catch (error) {
      this.logger.error('Failed to cancel orders:', error);
      throw new BadRequestException(`Failed to cancel orders: ${error.message}`);
    }
  }

  /**
   * Update leverage for a coin
   */
  async updateLeverage(
    walletId: string,
    coin: string,
    leverage: number,
    isCross: boolean = true,
  ): Promise<any> {
    const wallet = await this.walletsService.getWalletByUserId(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    if (!wallet.isApproved) {
      throw new BadRequestException('Agent wallet is not approved');
    }

    try {
      // Get asset index
      const meta = await this.infoClient.meta();
      const assetIndex = meta.universe.findIndex((m: any) => m.name === coin);
      
      if (assetIndex === -1) {
        throw new BadRequestException(`Invalid coin: ${coin}`);
      }

      const exchange = await this.createExchangeClient(walletId);

      const result = await exchange.updateLeverage({
        asset: assetIndex,
        isCross,
        leverage,
      });

      this.logger.log(`Leverage updated: ${coin} ${isCross ? 'cross' : 'isolated'} ${leverage}x`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to update leverage:', error);
      throw new BadRequestException(`Failed to update leverage: ${error.message}`);
    }
  }
}
