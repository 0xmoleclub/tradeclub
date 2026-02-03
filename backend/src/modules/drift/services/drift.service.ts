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
import { Connection, Keypair, PublicKey, Commitment, Transaction } from '@solana/web3.js';
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
   * Initialize Drift client for a specific user
   * Agent wallet signs transactions, but user wallet is the authority (holds funds)
   * 
   * @param skipDelegateCheck - If true, doesn't verify the on-chain delegate (useful for set-delegate endpoint)
   */
  async initializeForUser(
    userId: string, 
    userWalletAddress: string,
    skipDelegateCheck = false,
  ): Promise<DriftClient> {
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    
    if (!agentWallet) {
      throw new Error('Agent wallet not found for user');
    }

    // Only check database flag if we're not skipping delegate check (trading operations)
    if (!skipDelegateCheck && !agentWallet.isDelegated) {
      throw new Error('Agent wallet is not delegated on Drift');
    }

    // Decrypt secret key and create keypair (agent wallet - for signing)
    const secretKey = await this.agentWalletsService.getSecretKey(agentWallet.id);
    const keypair = Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);

    // Initialize Drift client with agent wallet for signing
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

    // Set the user to the user's main wallet (not agent wallet)
    // This is the wallet that holds the funds
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Check if user has a Drift account before trying to switch to it
    const hasAccount = await this.hasDriftAccount(driftClient, userPublicKey);
    if (!hasAccount) {
      throw new Error(`User account not found: ${userWalletAddress} does not have a Drift account. Please deposit first to initialize.`);
    }
    
    // Add user to DriftClient before switching (required by SDK)
    await driftClient.addUser(0, userPublicKey);
    
    // Switch to the user's account
    await driftClient.switchActiveUser(0, userPublicKey);

    // Verify that the agent wallet is set as delegate on-chain (skip for set-delegate flow)
    if (!skipDelegateCheck) {
      const user = driftClient.getUser();
      const userAccount = user.getUserAccount();
      const expectedDelegate = new PublicKey(agentWallet.publicKey);
      
      if (!userAccount.delegate || userAccount.delegate.toString() !== expectedDelegate.toString()) {
        throw new Error(
          `Agent wallet is not set as delegate on-chain. ` +
          `Current delegate: ${userAccount.delegate?.toString() || 'none'}. ` +
          `Please call POST /drift/account/set-delegate to authorize the agent wallet.`
        );
      }
    }

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
   * Also sets the agent wallet as delegate so it can sign transactions
   */
  async initializeDriftAccount(
    driftClient: DriftClient,
    agentPublicKey: PublicKey,
    name?: string,
  ): Promise<{ initSignature: string; delegateSignature: string }> {
    // Initialize the user account
    const [txSig, userAccountPublicKey] = await driftClient.initializeUserAccount(
      0, // subAccountId
      name || 'Main Account',
    );
    this.logger.log(`Initialized Drift account: ${txSig}`);

    // Set the agent wallet as delegate so it can sign transactions
    const delegateSig = await driftClient.updateUserDelegate(agentPublicKey, 0);
    this.logger.log(`Set delegate to ${agentPublicKey.toString()}: ${delegateSig}`);

    return { initSignature: txSig, delegateSignature: delegateSig };
  }

  /**
   * Update the delegate for a user's Drift account
   * This allows the agent wallet to sign transactions on behalf of the user
   */
  async updateUserDelegate(
    driftClient: DriftClient,
    delegatePublicKey: PublicKey,
  ): Promise<string> {
    const txSig = await driftClient.updateUserDelegate(delegatePublicKey, 0);
    this.logger.log(`Updated user delegate to ${delegatePublicKey.toString()}: ${txSig}`);
    return txSig;
  }

  /**
   * Get the current delegate for a user's Drift account
   */
  async getUserDelegate(driftClient: DriftClient): Promise<PublicKey | null> {
    try {
      const user = driftClient.getUser();
      const userAccount = user.getUserAccount();
      return userAccount.delegate || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Build a transaction to set the delegate
   * This transaction must be signed by the user (authority)
   */
  async buildSetDelegateTransaction(
    userWalletAddress: string,
    agentWalletPublicKey: string,
  ): Promise<string> {
    const authority = new PublicKey(userWalletAddress);
    const delegate = new PublicKey(agentWalletPublicKey);

    // Create a temporary drift client just to build the instruction
    // We use a dummy wallet since we're only building, not signing
    const dummyWallet = new Wallet(Keypair.generate());
    const driftClient = new DriftClient({
      connection: this.connection,
      wallet: dummyWallet,
      env: this.isDevnet ? 'devnet' : 'mainnet-beta',
    });

    await driftClient.subscribe();

    try {
      // Get user account public key
      const userAccountPublicKey = await getUserAccountPublicKey(
        driftClient.program.programId,
        authority,
        0,
      );

      // Get the update delegate instruction with explicit user account
      const ix = await driftClient.getUpdateUserDelegateIx(delegate, {
        subAccountId: 0,
        userAccountPublicKey,
        authority,
      });

      // Create transaction
      const transaction = new Transaction();
      
      // Add recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = authority; // User pays the fee
      
      // Add the instruction
      transaction.add(ix);

      // Serialize to base64
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return serialized.toString('base64');
    } finally {
      await driftClient.unsubscribe();
    }
  }

  /**
   * Build a transaction to initialize a Drift user account
   * This transaction must be signed by the user (authority)
   */
  async buildInitializeAccountTransaction(
    userWalletAddress: string,
    agentWalletPublicKey?: string,
  ): Promise<string> {
    const authority = new PublicKey(userWalletAddress);

    // Create a temporary drift client
    const dummyWallet = new Wallet(Keypair.generate());
    const driftClient = new DriftClient({
      connection: this.connection,
      wallet: dummyWallet,
      env: this.isDevnet ? 'devnet' : 'mainnet-beta',
    });

    await driftClient.subscribe();

    try {
      // Get the initialize user account instructions
      const [ixs] = await driftClient.getInitializeUserAccountIxs(0, 'Main Account');

      // Create transaction
      const transaction = new Transaction();
      
      // Add recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = authority; // User pays the fee
      
      // Add the instructions
      transaction.add(...ixs);

      // Serialize to base64
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      return serialized.toString('base64');
    } finally {
      await driftClient.unsubscribe();
    }
  }

  /**
   * Submit a signed transaction to the blockchain
   */
  async submitSignedTransaction(signedTransactionBase64: string): Promise<string> {
    const txBuffer = Buffer.from(signedTransactionBase64, 'base64');
    const transaction = Transaction.from(txBuffer);
    
    const signature = await this.connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');
    
    this.logger.log(`Submitted transaction: ${signature}`);
    return signature;
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
   * Shows agent wallet SOL (for gas) and user's Drift USDC balance
   * isActivated is based on whether user has a Drift account with the agent as delegate
   */
  async getAccountStatus(userId: string, userWalletAddress?: string): Promise<{
    isActivated: boolean;
    activatedAt: Date | null;
    minDepositUsd: number;
    agentWallet: {
      publicKey: string;
      solBalance: number;
      isDelegated: boolean;
    } | null;
    userDriftBalance: {
      usdcBalance: string;
      hasDriftAccount: boolean;
    };
  }> {
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    
    if (!agentWallet) {
      return {
        isActivated: false,
        activatedAt: null,
        minDepositUsd: this.jupiterService.getMinDepositUsdc(),
        agentWallet: null,
        userDriftBalance: {
          usdcBalance: '0',
          hasDriftAccount: false,
        },
      };
    }

    const agentPublicKey = new PublicKey(agentWallet.publicKey);
    
    // Get agent wallet SOL balance (for gas)
    const solBalance = await this.jupiterService.getSolBalance(agentPublicKey);

    // Get user's Drift USDC balance (if wallet address provided)
    let userDriftBalance = { usdcBalance: '0', hasDriftAccount: false };
    let isActivated = false;
    
    if (userWalletAddress) {
      const driftBalance = await this.checkMainWalletDriftBalance(userWalletAddress);
      userDriftBalance = {
        usdcBalance: driftBalance.usdcBalance,
        hasDriftAccount: driftBalance.hasDriftAccount,
      };
      // User is activated if they have a Drift account and agent is delegated
      isActivated = driftBalance.hasDriftAccount && agentWallet.isDelegated;
    }

    return {
      isActivated,
      activatedAt: agentWallet.activatedAt,
      minDepositUsd: this.jupiterService.getMinDepositUsdc(),
      agentWallet: {
        publicKey: agentWallet.publicKey,
        solBalance,
        isDelegated: agentWallet.isDelegated,
      },
      userDriftBalance,
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

    // Map string orderType to Drift SDK OrderType enum
    const orderTypeMap: Record<string, OrderType> = {
      'market': OrderType.MARKET,
      'limit': OrderType.LIMIT,
      'triggerMarket': OrderType.TRIGGER_MARKET,
      'triggerLimit': OrderType.TRIGGER_LIMIT,
      'oracle': OrderType.ORACLE,
    };

    // Map string direction to Drift SDK PositionDirection enum
    const directionMap: Record<string, PositionDirection> = {
      'long': PositionDirection.LONG,
      'short': PositionDirection.SHORT,
    };

    const orderType = orderTypeMap[params.orderType as string] ?? params.orderType;
    const direction = directionMap[params.direction as string] ?? params.direction;

    switch (orderType) {
      case OrderType.MARKET:
        optionalParams = getMarketOrderParams({
          marketIndex: params.marketIndex,
          direction,
          baseAssetAmount: params.baseAssetAmount,
          reduceOnly: params.reduceOnly,
        });
        break;

      case OrderType.LIMIT:
        optionalParams = getLimitOrderParams({
          marketIndex: params.marketIndex,
          direction,
          baseAssetAmount: params.baseAssetAmount,
          price: params.price!,
          reduceOnly: params.reduceOnly,
          postOnly: params.postOnly,
        });
        break;

      case OrderType.TRIGGER_MARKET:
        optionalParams = getTriggerMarketOrderParams({
          marketIndex: params.marketIndex,
          direction,
          baseAssetAmount: params.baseAssetAmount,
          triggerPrice: params.triggerPrice!,
          triggerCondition: direction === PositionDirection.LONG 
            ? OrderTriggerCondition.ABOVE 
            : OrderTriggerCondition.BELOW,
          reduceOnly: params.reduceOnly ?? true,
        });
        break;

      case OrderType.TRIGGER_LIMIT:
        optionalParams = getTriggerLimitOrderParams({
          marketIndex: params.marketIndex,
          direction,
          baseAssetAmount: params.baseAssetAmount,
          price: params.price!,
          triggerPrice: params.triggerPrice!,
          triggerCondition: direction === PositionDirection.LONG 
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
   * Place a market order with fallback to limit
   * First tries market order, if it fails (slippage), falls back to limit at market price + buffer
   */
  async placeMarketOrder(
    driftClient: DriftClient,
    params: {
      marketIndex: number;
      direction: PositionDirection;
      baseAssetAmount: BN;
    },
  ): Promise<{ signature: string; type: 'MARKET' | 'LIMIT_FALLBACK' }> {
    // Try market order first
    try {
      const optionalParams = getMarketOrderParams({
        marketIndex: params.marketIndex,
        direction: params.direction,
        baseAssetAmount: params.baseAssetAmount,
        reduceOnly: false,
      });

      const orderParams = getOrderParams(optionalParams, {
        marketType: MarketType.PERP,
      });

      const txSig = await driftClient.placePerpOrder(orderParams);
      this.logger.log(`Placed market order: ${txSig}`);
      return { signature: txSig, type: 'MARKET' };
    } catch (marketError) {
      this.logger.warn(`Market order failed, trying limit fallback: ${marketError.message}`);
      
      // Fallback: place limit order at market price with buffer
      const limitPrice = await this.calculateLimitPriceWithBuffer(
        driftClient,
        params.marketIndex,
        params.direction,
      );

      const optionalParams = getLimitOrderParams({
        marketIndex: params.marketIndex,
        direction: params.direction,
        baseAssetAmount: params.baseAssetAmount,
        price: limitPrice,
        reduceOnly: false,
        postOnly: false,
      });

      const orderParams = getOrderParams(optionalParams, {
        marketType: MarketType.PERP,
      });

      const txSig = await driftClient.placePerpOrder(orderParams);
      this.logger.log(`Placed limit fallback order: ${txSig}`);
      return { signature: txSig, type: 'LIMIT_FALLBACK' };
    }
  }

  /**
   * Calculate limit price with buffer for market order fallback
   * Uses 0.5% buffer and rounds to tick size for Drift compatibility
   */
  private async calculateLimitPriceWithBuffer(
    driftClient: DriftClient,
    marketIndex: number,
    direction: PositionDirection,
  ): Promise<BN> {
    // Get market account for oracle price and tick size
    const market = driftClient.getPerpMarketAccount(marketIndex);
    if (!market) {
      throw new Error(`Market ${marketIndex} not found`);
    }

    // Get tick size (minimum price increment)
    const tickSize = market.amm.orderTickSize;

    // Get oracle price (use lastOraclePrice from historical data)
    const oraclePrice = market.amm.historicalOracleData?.lastOraclePrice || market.amm.lastMarkPriceTwap;

    // Add 0.5% buffer for slippage protection (50 basis points)
    // LONG/BUY: price = oracle * 1.005 (slightly higher to ensure fill)
    // SHORT/SELL: price = oracle * 0.995 (slightly lower to ensure fill)
    const isLong = direction === PositionDirection.LONG;
    const bufferBps = 50; // 0.5% = 50 basis points
    const priceMultiplier = isLong 
      ? (10000 + bufferBps)  // 10050 = 1.005
      : (10000 - bufferBps); // 9950 = 0.995

    let limitPrice = oraclePrice.mul(new BN(priceMultiplier)).div(new BN(10000));

    // Round to tick size (Drift requires prices to be multiples of tick size)
    // For LONG: round UP to ensure order is aggressive enough
    // For SHORT: round DOWN to ensure order is aggressive enough
    if (!tickSize.isZero()) {
      if (isLong) {
        // Round UP: ((price / tickSize) + 1) * tickSize
        limitPrice = limitPrice.div(tickSize).add(new BN(1)).mul(tickSize);
      } else {
        // Round DOWN: (price / tickSize) * tickSize
        limitPrice = limitPrice.div(tickSize).mul(tickSize);
      }
    }

    this.logger.log(`Market fallback limit price: ${limitPrice.toString()} (isLong: ${isLong}, tickSize: ${tickSize.toString()})`);
    return limitPrice;
  }

  /**
   * Place a limit order
   * Simple helper for limit orders
   */
  async placeLimitOrder(
    driftClient: DriftClient,
    params: {
      marketIndex: number;
      direction: PositionDirection;
      baseAssetAmount: BN;
      price: BN;
    },
  ): Promise<string> {
    const optionalParams = getLimitOrderParams({
      marketIndex: params.marketIndex,
      direction: params.direction,
      baseAssetAmount: params.baseAssetAmount,
      price: params.price,
      reduceOnly: false, // Always false for opening positions
      postOnly: false,  // Always false (can take liquidity)
    });

    const orderParams = getOrderParams(optionalParams, {
      marketType: MarketType.PERP,
    });

    const txSig = await driftClient.placePerpOrder(orderParams);
    this.logger.log(`Placed limit order: ${txSig}`);
    
    return txSig;
  }

  /**
   * Close position at market price with fallback to limit
   * First tries market order, if it fails falls back to limit at market price + buffer
   */
  async closePositionMarket(
    driftClient: DriftClient,
    marketIndex: number,
  ): Promise<{ signature: string; closedAmount: string; type: 'MARKET' | 'LIMIT_FALLBACK' }> {
    const user = driftClient.getUser();
    const position = user.getPerpPosition(marketIndex);
    
    if (!position || position.baseAssetAmount.isZero()) {
      throw new Error(`No open position found for market ${marketIndex}`);
    }

    // Determine direction opposite to current position
    const isLong = position.baseAssetAmount.gt(new BN(0));
    const direction = isLong ? PositionDirection.SHORT : PositionDirection.LONG;
    const closeAmount = position.baseAssetAmount.abs();

    // Try market order first
    try {
      const optionalParams = getMarketOrderParams({
        marketIndex,
        direction,
        baseAssetAmount: closeAmount,
        reduceOnly: true,
      });

      const orderParams = getOrderParams(optionalParams, {
        marketType: MarketType.PERP,
      });

      const txSig = await driftClient.placePerpOrder(orderParams);
      this.logger.log(`Closed position at market: ${txSig}`);
      
      return {
        signature: txSig,
        closedAmount: closeAmount.toString(),
        type: 'MARKET',
      };
    } catch (marketError) {
      this.logger.warn(`Market close failed, trying limit fallback: ${marketError.message}`);
      
      // Fallback: place limit order at market price with buffer
      const limitPrice = await this.calculateLimitPriceWithBuffer(
        driftClient,
        marketIndex,
        direction,
      );

      const optionalParams = getLimitOrderParams({
        marketIndex,
        direction,
        baseAssetAmount: closeAmount,
        price: limitPrice,
        reduceOnly: true,
        postOnly: false,
      });

      const orderParams = getOrderParams(optionalParams, {
        marketType: MarketType.PERP,
      });

      const txSig = await driftClient.placePerpOrder(orderParams);
      this.logger.log(`Closed position with limit fallback: ${txSig}`);
      
      return {
        signature: txSig,
        closedAmount: closeAmount.toString(),
        type: 'LIMIT_FALLBACK',
      };
    }
  }

  /**
   * Close position at limit price
   * Automatically determines the correct direction and size based on current position
   */
  async closePositionLimit(
    driftClient: DriftClient,
    marketIndex: number,
    price: BN,
  ): Promise<{ signature: string; closedAmount: string }> {
    const user = driftClient.getUser();
    const position = user.getPerpPosition(marketIndex);
    
    if (!position || position.baseAssetAmount.isZero()) {
      throw new Error(`No open position found for market ${marketIndex}`);
    }

    // Determine direction opposite to current position
    const isLong = position.baseAssetAmount.gt(new BN(0));
    const direction = isLong ? PositionDirection.SHORT : PositionDirection.LONG;
    const closeAmount = position.baseAssetAmount.abs();

    const optionalParams = getLimitOrderParams({
      marketIndex,
      direction,
      baseAssetAmount: closeAmount,
      price,
      reduceOnly: true, // Important: prevents accidental position reversal
      postOnly: false,  // Can take liquidity when closing
    });

    const orderParams = getOrderParams(optionalParams, {
      marketType: MarketType.PERP,
    });

    const txSig = await driftClient.placePerpOrder(orderParams);
    this.logger.log(`Closed position at limit: ${txSig}`);
    
    return {
      signature: txSig,
      closedAmount: closeAmount.toString(),
    };
  }

  /**
   * Close all positions at market price
   * Returns array of signatures for each closed position
   */
  async closeAllPositions(
    driftClient: DriftClient,
  ): Promise<{ signatures: string[]; closedPositions: { marketIndex: number; amount: string }[] }> {
    const user = driftClient.getUser();
    const positions = user.getActivePerpPositions();
    
    const signatures: string[] = [];
    const closedPositions: { marketIndex: number; amount: string }[] = [];

    for (const position of positions) {
      if (position.baseAssetAmount.isZero()) continue;

      try {
        const result = await this.closePositionMarket(driftClient, position.marketIndex);
        signatures.push(result.signature);
        closedPositions.push({
          marketIndex: position.marketIndex,
          amount: result.closedAmount,
        });
      } catch (error) {
        this.logger.error(`Failed to close position for market ${position.marketIndex}: ${error.message}`);
        // Continue closing other positions even if one fails
      }
    }

    this.logger.log(`Closed ${signatures.length} positions`);
    return { signatures, closedPositions };
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
    },
    isStopLoss: boolean,
  ): Promise<string> {
    // Determine trigger condition
    // For LONG position: TP = trigger above, SL = trigger below
    // For SHORT position: TP = trigger below, SL = trigger above
    const triggerCondition = isStopLoss
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
    this.logger.log(`Placed ${isStopLoss ? 'Stop Loss' : 'Take Profit'} order: ${txSig}`);
    
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
   * Deposit collateral with automatic account initialization
   * - USDC: Direct deposit
   * - SOL: Swap to USDC via Jupiter, then deposit
   * - If Drift account doesn't exist, initializes it first (costs ~0.002 SOL)
   * Minimum deposit: $5
   */
  async deposit(
    driftClient: DriftClient,
    userId: string,
    params: DepositParams & { paymentMethod: PaymentMethod },
  ): Promise<{
    signature: string;
    swapSignature?: string;
    initSignature?: string;
    delegateSignature?: string;
    isFirstDeposit: boolean;
    depositedAmount: string;
    message: string;
  }> {
    const MIN_DEPOSIT_USD = 5;
    const depositAmountUsd = Number(params.amount);

    // Validate minimum deposit
    if (depositAmountUsd < MIN_DEPOSIT_USD) {
      throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
    }

    // Get agent wallet
    const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(userId);
    if (!agentWallet) {
      throw new Error('Agent wallet not found');
    }

    const isFirstDeposit = !agentWallet.isActivated;
    let initSignature: string | undefined;
    let delegateSignature: string | undefined;

    // Check if Drift account exists, initialize if not
    const user = driftClient.getUser();
    const authority = user.getUserAccount().authority;
    const hasDriftAccount = await this.hasDriftAccount(driftClient, authority);
    
    if (!hasDriftAccount) {
      this.logger.log(`Initializing Drift account for user ${userId}`);
      const agentPublicKey = new PublicKey(agentWallet.publicKey);
      const initResult = await this.initializeDriftAccount(driftClient, agentPublicKey);
      initSignature = initResult.initSignature;
      delegateSignature = initResult.delegateSignature;
      this.logger.log(`Drift account initialized with delegate: ${initSignature}`);
    } else {
      // Check if delegate is set correctly
      const currentDelegate = await this.getUserDelegate(driftClient);
      const agentPublicKey = new PublicKey(agentWallet.publicKey);
      if (!currentDelegate || currentDelegate.toString() !== agentPublicKey.toString()) {
        this.logger.log(`Updating delegate to agent wallet ${agentWallet.publicKey}`);
        delegateSignature = await this.updateUserDelegate(driftClient, agentPublicKey);
      }
    }

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

    const message = initSignature 
      ? `Account initialized and ${depositAmountUsd} USDC deposited successfully`
      : `${depositAmountUsd} USDC deposited successfully`;

    return {
      signature: txSig,
      swapSignature,
      initSignature,
      delegateSignature,
      isFirstDeposit,
      depositedAmount: usdcAmount.toString(),
      message,
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
  /**
   * Calculate mark price from AMM
   */
  private calculateAMMMarkPrice(amm: any): number {
    try {
      if (!amm) return 0;
      
      // Use SDK's calculation: quoteAssetReserve / baseAssetReserve * pegMultiplier / PRICE_PRECISION
      const baseAssetReserve = amm.baseAssetReserve?.toNumber() || 0;
      const quoteAssetReserve = amm.quoteAssetReserve?.toNumber() || 0;
      const pegMultiplier = amm.pegMultiplier?.toNumber() || 0;
      
      if (baseAssetReserve === 0 || quoteAssetReserve === 0 || pegMultiplier === 0) {
        return 0;
      }
      
      // Drift's formula: (quote / base) * (peg / 1e6)
      return (quoteAssetReserve / baseAssetReserve) * (pegMultiplier / 1e6);
    } catch {
      return 0;
    }
  }

  /**
   * Get markets with live data from Drift
   */
  async getMarkets(): Promise<MarketInfo[]> {
    const perpMarkets = this.isDevnet ? DevnetPerpMarkets : MainnetPerpMarkets;
    const driftClient = await this.initializePublicClient();
    
    // Wait for markets to be loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      return perpMarkets.map((market) => {
        try {
          const perpMarketAccount = driftClient.getPerpMarketAccount(market.marketIndex);
          
          if (!perpMarketAccount) {
            throw new Error(`Market ${market.marketIndex} not found`);
          }
          
          // Get oracle price
          let oraclePrice = 0;
          try {
            const oracleData = driftClient.getOracleDataForPerpMarket(market.marketIndex);
            oraclePrice = oracleData?.price?.toNumber() || 0;
            // Oracle price is in 1e6 precision
            oraclePrice = oraclePrice / 1e6;
          } catch {
            // Oracle might be stale, continue with 0
          }
          
          // Calculate mark price from AMM
          const ammMarkPrice = this.calculateAMMMarkPrice(perpMarketAccount.amm);
          
          // Fallback: use lastMarkPriceTwap if AMM calculation fails
          let markPrice = ammMarkPrice;
          if (markPrice === 0) {
            const lastMarkTwap = (perpMarketAccount as any).lastMarkPriceTwap?.toNumber();
            if (lastMarkTwap) {
              markPrice = lastMarkTwap / 1e6;
            }
          }
          
          // Final fallback to oracle price
          if (markPrice === 0 && oraclePrice > 0) {
            markPrice = oraclePrice;
          }
          
          // Calculate bid/ask spread around mark price (0.05%)
          const spreadPct = 0.0005;
          const bidPrice = markPrice > 0 ? markPrice * (1 - spreadPct) : 0;
          const askPrice = markPrice > 0 ? markPrice * (1 + spreadPct) : 0;
          
          // Get volume and open interest
          const volume24h = (perpMarketAccount as any)?.volume24h?.toString() || '0';
          const openInterest = (perpMarketAccount as any)?.openInterest?.toString() || 
                               perpMarketAccount?.numberOfUsers?.toString() || '0';
          
          // Margin ratios from market (stored as 10000 = 100%)
          const imrRaw = perpMarketAccount?.marginRatioInitial?.toString() || '2000';
          const mmrRaw = perpMarketAccount?.marginRatioMaintenance?.toString() || '1000';
          
          const imrNum = parseInt(imrRaw) / 10000;
          const maxLeverage = imrNum > 0 ? Math.round(1 / imrNum) : 5;
          
          return {
            marketIndex: market.marketIndex,
            symbol: market.symbol,
            baseAssetSymbol: market.baseAssetSymbol,
            quoteAssetSymbol: 'USDC',
            markPrice: markPrice > 0 ? markPrice.toFixed(4) : '0',
            oraclePrice: oraclePrice > 0 ? oraclePrice.toFixed(4) : '0',
            bidPrice: bidPrice > 0 ? bidPrice.toFixed(4) : '0',
            askPrice: askPrice > 0 ? askPrice.toFixed(4) : '0',
            volume24h,
            openInterest,
            maxLeverage,
            initialMarginRatio: imrNum.toString(),
            maintenanceMarginRatio: (parseInt(mmrRaw) / 10000).toString(),
          };
        } catch (err) {
          console.error(`Error fetching market ${market.marketIndex}:`, err.message);
          // Return basic info if market data fetch fails
          return {
            marketIndex: market.marketIndex,
            symbol: market.symbol,
            baseAssetSymbol: market.baseAssetSymbol,
            quoteAssetSymbol: 'USDC',
            markPrice: '0',
            oraclePrice: '0',
            bidPrice: '0',
            askPrice: '0',
            volume24h: '0',
            openInterest: '0',
            maxLeverage: 5,
            initialMarginRatio: '0.2',
            maintenanceMarginRatio: '0.1',
          };
        }
      });
    } finally {
      await driftClient.unsubscribe();
    }
  }

  /**
   * Initialize a read-only Drift client for public market data
   */
  async initializePublicClient(): Promise<DriftClient> {
    const perpMarkets = this.isDevnet ? DevnetPerpMarkets : MainnetPerpMarkets;
    
    // Create a dummy wallet (not used for signing, just for reading)
    const dummyKeypair = Keypair.generate();
    const wallet = new Wallet(dummyKeypair);
    
    const driftClient = new DriftClient({
      connection: this.connection,
      wallet,
      env: this.isDevnet ? 'devnet' : 'mainnet-beta',
      perpMarketIndexes: perpMarkets.map(m => m.marketIndex),
    });
    
    await driftClient.subscribe();
    return driftClient;
  }

  /**
   * Get market price from oracle (public, no auth required)
   */
  async getMarketPrice(marketIndex: number): Promise<string>;
  async getMarketPrice(driftClient: DriftClient, marketIndex: number): Promise<string>;
  async getMarketPrice(
    driftClientOrIndex: DriftClient | number,
    marketIndex?: number,
  ): Promise<string> {
    let client: DriftClient;
    let index: number;
    let shouldUnsubscribe = false;
    
    if (typeof driftClientOrIndex === 'number') {
      // Public access - create temporary client
      client = await this.initializePublicClient();
      index = driftClientOrIndex;
      shouldUnsubscribe = true;
    } else {
      // Authenticated access - use provided client
      client = driftClientOrIndex;
      index = marketIndex!;
    }
    
    try {
      const oracleData = client.getOracleDataForPerpMarket(index);
      return oracleData.price.toString();
    } finally {
      if (shouldUnsubscribe) {
        await client.unsubscribe();
      }
    }
  }

  /**
   * Check if user's main wallet already has USDC in Drift
   * For users who deposited to Drift before using TradeClub
   */
  async checkMainWalletDriftBalance(
    walletAddress: string,
  ): Promise<{
    hasDriftAccount: boolean;
    usdcBalance: string;
    hasExistingDeposit: boolean;
    message: string;
  }> {
    try {
      const authority = new PublicKey(walletAddress);
      
      // Try to get user account public key for subaccount 0
      const userAccountPublicKey = await getUserAccountPublicKey(
        new PublicKey('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'), // Drift program ID (mainnet/devnet same)
        authority,
        0,
      );

      // Check if account exists
      const accountInfo = await this.connection.getAccountInfo(userAccountPublicKey);
      
      if (!accountInfo) {
        return {
          hasDriftAccount: false,
          usdcBalance: '0',
          hasExistingDeposit: false,
          message: 'No existing Drift account found for this wallet',
        };
      }

      // Account exists - need to fetch USDC balance
      // For this we need a read-only drift client
      const wallet = {
        publicKey: authority,
        signTransaction: async () => { throw new Error('Read only'); },
        signAllTransactions: async () => { throw new Error('Read only'); },
      } as any;

      const driftClient = new DriftClient({
        connection: this.connection,
        wallet,
        env: this.isDevnet ? 'devnet' : 'mainnet-beta',
        opts: { commitment: 'confirmed' },
      });

      await driftClient.subscribe();

      try {
        const user = driftClient.getUser();
        
        // Get USDC spot position (market index 0)
        const spotPosition = user.getSpotPosition(0);
        const usdcBalance = spotPosition?.scaledBalance.toString() || '0';
        
        // Convert from drift's internal format to USDC
        // Drift stores balances with precision, we need to format it
        const usdcBalanceNum = user.getTokenAmount(0).toNumber() / 1_000_000;

        await driftClient.unsubscribe();

        const hasDeposit = usdcBalanceNum > 0;

        return {
          hasDriftAccount: true,
          usdcBalance: usdcBalanceNum.toFixed(6),
          hasExistingDeposit: hasDeposit,
          message: hasDeposit 
            ? `Found ${usdcBalanceNum.toFixed(2)} USDC in your Drift account`
            : 'Drift account exists but no USDC balance found',
        };
      } catch (error) {
        await driftClient.unsubscribe();
        return {
          hasDriftAccount: true,
          usdcBalance: '0',
          hasExistingDeposit: false,
          message: 'Drift account exists but could not read balance',
        };
      }
    } catch (error) {
      this.logger.error(`Error checking external balance: ${error.message}`);
      return {
        hasDriftAccount: false,
        usdcBalance: '0',
        hasExistingDeposit: false,
        message: 'Could not check Drift balance',
      };
    }
  }
}

/**
 * Helper to decode market name from bytes
 */
function decodeSymbol(name: number[]): string {
  return String.fromCharCode(...name).replace(/\0/g, '');
}
