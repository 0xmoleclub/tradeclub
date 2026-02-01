import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DriftClient,
  Wallet,
  BN,
  PositionDirection,
  OrderType,
  MarketType,
  OrderTriggerCondition,
  getMarketOrderParams,
  getLimitOrderParams,
  getTriggerMarketOrderParams,
  getTriggerLimitOrderParams,
  getUserAccountPublicKey,
  DevnetPerpMarkets,
  MainnetPerpMarkets,
  OrderParams,
  PerpMarkets,
  getOrderParams,
} from '@drift-labs/sdk';
import { Connection, Keypair, PublicKey, Commitment } from '@solana/web3.js';
import { PrismaService } from '../../../database/prisma.service';
import { AgentWalletsService } from '../../agent-wallets/services/agent-wallets.service';
import { JupiterService } from './jupiter.service';
import { PaymentMethod } from '../dto/deposit.dto';
import {
  PlaceOrderParams,
  CancelOrderParams,
  DepositParams,
  WithdrawParams,
  PositionInfo,
  OrderInfo,
  AccountInfo,
  MarketInfo,
} from '../types/drift.types';

@Injectable()
export class DriftService implements OnModuleInit {
  private readonly logger = new Logger(DriftService.name);
  private connection: Connection;
  private isDevnet: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private agentWalletsService: AgentWalletsService,
    private jupiterService: JupiterService,
  ) {
    this.isDevnet = this.configService.get('SOLANA_NETWORK', 'devnet') === 'devnet';
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL', 'https://api.devnet.solana.com');
    const commitment = this.configService.get<Commitment>('SOLANA_COMMITMENT', 'confirmed');
    
    this.connection = new Connection(rpcUrl, commitment);
  }

  async onModuleInit() {
    this.logger.log(`Drift Service initialized (${this.isDevnet ? 'devnet' : 'mainnet'})`);
  }

  /**
   * Initialize Drift client for a specific user (using their agent wallet)
   */
  async initializeForUser(userId: string): Promise<DriftClient> {
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    
    if (!agentWallet) {
      throw new Error('Agent wallet not found for user');
    }

    if (!agentWallet.isDelegated) {
      throw new Error('Agent wallet is not delegated on Drift');
    }

    // Decrypt secret key and create keypair
    const secretKey = await this.agentWalletsService.getSecretKey(agentWallet.id);
    const keypair = Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);

    // Initialize Drift client
    const driftClient = new DriftClient({
      connection: this.connection,
      wallet,
      env: this.isDevnet ? 'devnet' : 'mainnet-beta',
      opts: {
        commitment: 'confirmed',
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      },
    });

    await driftClient.subscribe();

    return driftClient;
  }

  /**
   * Get Drift user account public key for a given authority
   */
  async getUserAccountPublicKey(
    driftClient: DriftClient,
    authority: PublicKey,
    subAccountId = 0,
  ): Promise<PublicKey> {
    return getUserAccountPublicKey(
      driftClient.program.programId,
      authority,
      subAccountId,
    );
  }

  /**
   * Check if user has initialized Drift account
   * Note: This requires a drift client to get the program ID. 
   * In production, you'd store the program ID as a constant.
   */
  async hasDriftAccount(
    driftClient: DriftClient,
    authority: PublicKey,
    subAccountId = 0,
  ): Promise<boolean> {
    try {
      const userAccountPublicKey = await this.getUserAccountPublicKey(
        driftClient,
        authority,
        subAccountId,
      );
      const account = await this.connection.getAccountInfo(userAccountPublicKey);
      return account !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize Drift account for user
   */
  async initializeDriftAccount(
    driftClient: DriftClient,
    name?: string,
  ): Promise<string> {
    const [txSig] = await driftClient.initializeUserAccount(
      0, // subAccountId
      name || 'Main Account',
    );

    this.logger.log(`Initialized Drift account for user`);
    return txSig;
  }

  /**
   * Get user account info
   */
  async getAccountInfo(driftClient: DriftClient): Promise<AccountInfo> {
    const user = driftClient.getUser();
    
    return {
      collateral: user.getTotalCollateral().toString(),
      freeCollateral: user.getFreeCollateral().toString(),
      totalCollateral: user.getTotalCollateral().toString(),
      marginRatio: user.getMarginRatio().toString(),
      leverage: user.getLeverage().toString(),
      buyingPower: user.getPerpBuyingPower(0).toString(), // Default to market 0
      isLiquidatable: (user.canBeLiquidated() as any).liquidatable === true,
      settledPerpPnl: user.getUnrealizedPNL().toString(),
      numberOfSubAccounts: 1, // Simplified
    };
  }

  /**
   * Get account activation status and wallet balances
   */
  async getAccountStatus(userId: string): Promise<{
    isActivated: boolean;
    activatedAt: Date | null;
    minDepositUsd: number;
    agentWallet: {
      publicKey: string;
      solBalance: number;
      usdcBalance: number;
    } | null;
    hasDriftAccount: boolean;
  }> {
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    
    if (!agentWallet) {
      return {
        isActivated: false,
        activatedAt: null,
        minDepositUsd: this.jupiterService.getMinDepositUsdc(),
        agentWallet: null,
        hasDriftAccount: false,
      };
    }

    const publicKey = new PublicKey(agentWallet.publicKey);
    
    // Get balances
    const [solBalance, usdcBalance] = await Promise.all([
      this.jupiterService.getSolBalance(publicKey),
      this.jupiterService.getUsdcBalance(publicKey),
    ]);

    // Check if Drift account exists (simplified - would need driftClient)
    // For now, we assume if activated, Drift account exists
    const hasDriftAccount = agentWallet.isActivated;

    return {
      isActivated: agentWallet.isActivated,
      activatedAt: agentWallet.activatedAt,
      minDepositUsd: this.jupiterService.getMinDepositUsdc(),
      agentWallet: {
        publicKey: agentWallet.publicKey,
        solBalance,
        usdcBalance,
      },
      hasDriftAccount,
    };
  }

  /**
   * Get user's perpetual positions
   */
  async getPositions(driftClient: DriftClient): Promise<PositionInfo[]> {
    const user = driftClient.getUser();
    const positions = user.getActivePerpPositions();

    return positions.map((pos) => {
      const market = driftClient.getPerpMarketAccount(pos.marketIndex);
      const marketSymbol = market ? decodeSymbol(market.name) : `PERP-${pos.marketIndex}`;
      
      return {
        marketIndex: pos.marketIndex,
        marketSymbol,
        baseAssetAmount: pos.baseAssetAmount.toString(),
        quoteAssetAmount: pos.quoteAssetAmount.toString(),
        entryPrice: pos.quoteEntryAmount.abs().gt(new BN(0)) 
          ? pos.quoteEntryAmount.div(pos.baseAssetAmount.abs()).toString()
          : '0',
        markPrice: '0', // Would need to fetch from oracle
        unrealizedPnl: pos.quoteAssetAmount.sub(pos.quoteEntryAmount).toString(),
        realizedPnl: pos.quoteBreakEvenAmount.sub(pos.quoteEntryAmount).toString(),
        liquidationPrice: null, // Would need to calculate
        leverage: user.getLeverage().toString(),
        isLong: pos.baseAssetAmount.gt(new BN(0)),
      };
    });
  }

  /**
   * Get user's open orders
   */
  async getOrders(driftClient: DriftClient): Promise<OrderInfo[]> {
    const user = driftClient.getUser();
    const orders = user.getOpenOrders();

    return orders.map((order) => {
      const market = driftClient.getPerpMarketAccount(order.marketIndex);
      const marketSymbol = market ? decodeSymbol(market.name) : `PERP-${order.marketIndex}`;

      return {
        orderId: order.orderId,
        marketIndex: order.marketIndex,
        marketSymbol,
        orderType: String(order.orderType),
        direction: String(order.direction),
        baseAssetAmount: order.baseAssetAmount.toString(),
        filledBaseAssetAmount: order.baseAssetAmountFilled.toString(),
        price: order.price.toString(),
        triggerPrice: order.triggerPrice.toString(),
        reduceOnly: order.reduceOnly,
        postOnly: order.postOnly,
        status: order.reduceOnly ? 'reduce_only' : 'open',
        slot: order.slot.toNumber(),
      };
    });
  }

  /**
   * Place an order
   */
  async placeOrder(
    driftClient: DriftClient,
    params: PlaceOrderParams,
  ): Promise<string> {
    let optionalParams;

    switch (params.orderType) {
      case OrderType.MARKET:
        optionalParams = getMarketOrderParams({
          marketIndex: params.marketIndex,
          direction: params.direction,
          baseAssetAmount: params.baseAssetAmount,
          reduceOnly: params.reduceOnly,
        });
        break;

      case OrderType.LIMIT:
        optionalParams = getLimitOrderParams({
          marketIndex: params.marketIndex,
          direction: params.direction,
          baseAssetAmount: params.baseAssetAmount,
          price: params.price!,
          reduceOnly: params.reduceOnly,
          postOnly: params.postOnly,
        });
        break;

      case OrderType.TRIGGER_MARKET:
        optionalParams = getTriggerMarketOrderParams({
          marketIndex: params.marketIndex,
          direction: params.direction,
          baseAssetAmount: params.baseAssetAmount,
          triggerPrice: params.triggerPrice!,
          triggerCondition: params.direction === PositionDirection.LONG 
            ? OrderTriggerCondition.ABOVE 
            : OrderTriggerCondition.BELOW,
          reduceOnly: params.reduceOnly ?? true,
        });
        break;

      case OrderType.TRIGGER_LIMIT:
        optionalParams = getTriggerLimitOrderParams({
          marketIndex: params.marketIndex,
          direction: params.direction,
          baseAssetAmount: params.baseAssetAmount,
          price: params.price!,
          triggerPrice: params.triggerPrice!,
          triggerCondition: params.direction === PositionDirection.LONG 
            ? OrderTriggerCondition.ABOVE 
            : OrderTriggerCondition.BELOW,
          reduceOnly: params.reduceOnly ?? true,
        });
        break;

      default:
        throw new Error(`Unsupported order type: ${params.orderType}`);
    }

    // Convert OptionalOrderParams to OrderParams by adding marketType
    const orderParams = getOrderParams(optionalParams, {
      marketType: MarketType.PERP,
    });

    const txSig = await driftClient.placePerpOrder(orderParams);
    this.logger.log(`Placed order: ${txSig}`);
    
    return txSig;
  }

  /**
   * Place Take Profit or Stop Loss order
   * Simplified helper for TP/SL orders
   */
  async placeTpSlOrder(
    driftClient: DriftClient,
    params: {
      marketIndex: number;
      direction: PositionDirection;
      baseAssetAmount: BN;
      triggerPrice: BN;
      limitPrice?: BN;
      isStopLoss: boolean;
    },
  ): Promise<string> {
    // Determine trigger condition
    // For LONG position: TP = trigger above, SL = trigger below
    // For SHORT position: TP = trigger below, SL = trigger above
    const triggerCondition = params.isStopLoss
      ? (params.direction === PositionDirection.LONG 
          ? OrderTriggerCondition.BELOW 
          : OrderTriggerCondition.ABOVE)
      : (params.direction === PositionDirection.LONG 
          ? OrderTriggerCondition.ABOVE 
          : OrderTriggerCondition.BELOW);

    let optionalParams;

    if (params.limitPrice && params.limitPrice.gt(new BN(0))) {
      // Trigger Limit Order (TP/SL with limit price)
      optionalParams = getTriggerLimitOrderParams({
        marketIndex: params.marketIndex,
        direction: params.direction,
        baseAssetAmount: params.baseAssetAmount,
        price: params.limitPrice,
        triggerPrice: params.triggerPrice,
        triggerCondition,
        reduceOnly: true,
      });
    } else {
      // Trigger Market Order (TP/SL with market execution)
      optionalParams = getTriggerMarketOrderParams({
        marketIndex: params.marketIndex,
        direction: params.direction,
        baseAssetAmount: params.baseAssetAmount,
        triggerPrice: params.triggerPrice,
        triggerCondition,
        reduceOnly: true,
      });
    }

    const orderParams = getOrderParams(optionalParams, {
      marketType: MarketType.PERP,
    });

    const txSig = await driftClient.placePerpOrder(orderParams);
    this.logger.log(`Placed ${params.isStopLoss ? 'Stop Loss' : 'Take Profit'} order: ${txSig}`);
    
    return txSig;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    driftClient: DriftClient,
    params: CancelOrderParams,
  ): Promise<string> {
    const txSig = await driftClient.cancelOrder(params.orderId);
    this.logger.log(`Cancelled order ${params.orderId}: ${txSig}`);
    return txSig;
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(driftClient: DriftClient): Promise<string> {
    const txSig = await driftClient.cancelOrders();
    this.logger.log(`Cancelled all orders: ${txSig}`);
    return txSig;
  }

  /**
   * Deposit collateral with payment method handling
   * - USDC: Direct deposit
   * - SOL: Swap to USDC via Jupiter, then deposit
   * Minimum deposit: $5
   * First deposit activates the account
   */
  async deposit(
    driftClient: DriftClient,
    userId: string,
    params: DepositParams & { paymentMethod: PaymentMethod },
  ): Promise<{
    signature: string;
    swapSignature?: string;
    isFirstDeposit: boolean;
    depositedAmount: string;
  }> {
    const MIN_DEPOSIT_USD = 5;
    const depositAmountUsd = Number(params.amount);

    // Validate minimum deposit
    if (depositAmountUsd < MIN_DEPOSIT_USD) {
      throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
    }

    // Get agent wallet to check activation status
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    if (!agentWallet) {
      throw new Error('Agent wallet not found');
    }

    // Check/initialize Drift account if needed
    const user = driftClient.getUser();
    const authority = user.getUserAccount().authority;
    const isFirstDeposit = !agentWallet.isActivated;

    let swapSignature: string | undefined;

    // Handle payment method
    if (params.paymentMethod === PaymentMethod.SOL) {
      // Swap SOL to exact USDC amount
      this.logger.log(`Swapping SOL to ${depositAmountUsd} USDC for deposit`);
      const swapResult = await this.jupiterService.swapSolToExactUsdc(
        agentWallet.publicKey,
        depositAmountUsd,
      );
      swapSignature = swapResult.signature;
      this.logger.log(`Swap completed: ${swapSignature}`);
    } else {
      // Check USDC balance
      const usdcBalance = await this.jupiterService.getUsdcBalance(authority);
      if (usdcBalance < depositAmountUsd) {
        throw new Error(
          `Insufficient USDC balance. Need $${depositAmountUsd}, have $${usdcBalance.toFixed(2)}`,
        );
      }
    }

    // Convert USD amount to USDC base units (6 decimals)
    const usdcAmount = new BN(depositAmountUsd * 1_000_000);

    // Get USDC token account
    const tokenAccount = await this.getAssociatedTokenAccount(
      driftClient,
      0, // USDC spot market index
      authority,
    );

    // Deposit to Drift
    const txSig = await driftClient.deposit(
      usdcAmount,
      0, // USDC market index
      tokenAccount,
      undefined, // subAccountId
      params.reduceOnly,
    );

    this.logger.log(`Deposited ${depositAmountUsd} USDC to Drift: ${txSig}`);

    // Mark account as activated on first deposit
    if (isFirstDeposit) {
      await this.prisma.agentWallet.update({
        where: { userId },
        data: {
          isActivated: true,
          activatedAt: new Date(),
        },
      });
      this.logger.log(`Account activated for user ${userId}`);
    }

    return {
      signature: txSig,
      swapSignature,
      isFirstDeposit,
      depositedAmount: usdcAmount.toString(),
    };
  }

  /**
   * Withdraw collateral
   */
  async withdraw(
    driftClient: DriftClient,
    params: WithdrawParams,
  ): Promise<string> {
    const user = driftClient.getUser();
    const authority = user.getUserAccount().authority;
    
    // Get associated token account for the collateral mint
    const tokenAccount = await this.getAssociatedTokenAccount(
      driftClient,
      params.marketIndex,
      authority,
    );
    
    const txSig = await driftClient.withdraw(
      params.amount,
      params.marketIndex,
      tokenAccount,
      params.reduceOnly,
    );
    this.logger.log(`Withdrew ${params.amount} from market ${params.marketIndex}: ${txSig}`);
    return txSig;
  }

  /**
   * Helper to get associated token account
   */
  private async getAssociatedTokenAccount(
    driftClient: DriftClient,
    marketIndex: number,
    owner: PublicKey,
  ): Promise<PublicKey> {
    // For spot markets, get the mint from the spot market account
    // For now, assuming USDC (marketIndex 0) which is the default collateral
    // In production, you'd look up the actual mint from the spot market
    const spotMarket = driftClient.getSpotMarketAccount(marketIndex);
    if (!spotMarket) {
      throw new Error(`Spot market ${marketIndex} not found`);
    }
    
    const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
    return getAssociatedTokenAddressSync(spotMarket.mint, owner, true);
  }

  /**
   * Get available markets
   */
  getMarkets(): MarketInfo[] {
    const perpMarkets = this.isDevnet ? DevnetPerpMarkets : MainnetPerpMarkets;
    
    return perpMarkets.map((market) => ({
      marketIndex: market.marketIndex,
      symbol: market.symbol,
      baseAssetSymbol: market.baseAssetSymbol,
      quoteAssetSymbol: 'USDC', // Perp markets are quoted in USDC
      markPrice: '0', // Would need to fetch from oracle
      oraclePrice: '0',
      bidPrice: '0',
      askPrice: '0',
      volume24h: '0',
      openInterest: '0',
      maxLeverage: 5, // Default, actual value from market
      initialMarginRatio: '0.2',
      maintenanceMarginRatio: '0.1',
    }));
  }

  /**
   * Get market price from oracle
   */
  async getMarketPrice(driftClient: DriftClient, marketIndex: number): Promise<string> {
    const oracleData = driftClient.getOracleDataForPerpMarket(marketIndex);
    return oracleData.price.toString();
  }
}

/**
 * Helper to decode market name from bytes
 */
function decodeSymbol(name: number[]): string {
  return String.fromCharCode(...name).replace(/\0/g, '');
}
