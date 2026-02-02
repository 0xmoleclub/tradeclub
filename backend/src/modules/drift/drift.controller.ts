import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DriftService } from './services/drift.service';
import { AgentWalletsService } from '../agent-wallets/services/agent-wallets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Payload } from '../auth/auth.interface';
import { MarketOrderDto, LimitOrderDto, ClosePositionMarketDto, ClosePositionLimitDto, PlaceTpSlDto, CancelOrderDto, DepositDto, WithdrawDto } from './dto';
import { PositionDirection, BN } from '@drift-labs/sdk';
import { PublicKey } from '@solana/web3.js';

@Controller('drift')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriftController {
  constructor(
    private readonly driftService: DriftService,
    private readonly agentWalletsService: AgentWalletsService,
  ) {}

  // ==================== Drift Account ====================

  @Get('account')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Get Drift account info',
    description: 'Returns collateral, margin, leverage, and other account metrics',
  })
  @ApiResponse({ status: 200, description: 'Account info retrieved' })
  @ApiResponse({ status: 400, description: 'Agent wallet not found or not delegated' })
  async getAccountInfo(@CurrentUser() user: Payload) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      const info = await this.driftService.getAccountInfo(driftClient);
      await driftClient.unsubscribe();
      return { info };
    } catch (error) {
      // Return proper error instead of 500
      if (error.message === 'Agent wallet not found for user') {
        return {
          error: 'NO_AGENT_WALLET',
          message: 'Please create an agent wallet first',
          setupRequired: true,
        };
      }
      if (error.message === 'Agent wallet is not delegated on Drift') {
        return {
          error: 'NOT_DELEGATED',
          message: 'Please delegate your agent wallet on Drift Protocol',
          agentWallet: (await this.driftService.getAccountStatus(user.id, user.walletAddress)).agentWallet,
          setupRequired: true,
        };
      }
      if (error.message?.includes('User account not found') || error.message?.includes('does not have a drift account')) {
        return {
          error: 'NO_DRIFT_ACCOUNT',
          message: 'You do not have a Drift account. Please deposit to initialize.',
          setupRequired: true,
        };
      }
      if (error.message?.includes('not set as delegate on-chain')) {
        return {
          error: 'DELEGATE_NOT_SET',
          message: 'Agent wallet is not authorized to trade. Please call POST /drift/account/set-delegate',
          setupRequired: true,
          action: 'SET_DELEGATE',
        };
      }
      // Log error and return 400
      console.error('Account info error:', error);
      return {
        error: 'DRIFT_ERROR',
        message: error.message || 'Failed to get account info',
      };
    }
  }

  @Get('account/status')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Get account activation status',
    description: 'Returns activation status, agent wallet SOL balance (for gas), and user Drift USDC balance',
  })
  async getAccountStatus(@CurrentUser() user: Payload) {
    const status = await this.driftService.getAccountStatus(user.id, user.walletAddress);
    return status;
  }

  @Get('account/external-balance')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Check main wallet Drift balance',
    description: 'Checks if the user\'s main wallet already has USDC deposited in Drift Protocol (for users who used Drift before TradeClub)',
  })
  async checkExternalBalance(@CurrentUser() user: Payload) {
    const balance = await this.driftService.checkMainWalletDriftBalance(user.walletAddress);
    return balance;
  }

  @Get('account/delegation-tx')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Get unsigned delegation transaction',
    description: 'Returns an unsigned transaction to authorize the agent wallet. Sign and submit DIRECTLY to Solana (not to backend). See docs/FRONTEND_INTEGRATION.md',
  })
  async getDelegationTx(@CurrentUser() user: Payload) {
    try {
      const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
      if (!agentWallet) {
        return {
          success: false,
          error: 'NO_AGENT_WALLET',
          message: 'Create an agent wallet first: POST /agent-wallets',
          setupRequired: true,
        };
      }

      const hasAccount = await this.driftService.checkMainWalletDriftBalance(user.walletAddress);
      if (!hasAccount.hasDriftAccount) {
        return {
          success: false,
          error: 'NO_DRIFT_ACCOUNT',
          message: 'Deposit first: POST /drift/deposit',
          setupRequired: true,
        };
      }

      const serializedTx = await this.driftService.buildSetDelegateTransaction(
        user.walletAddress,
        agentWallet.publicKey,
      );

      return {
        success: true,
        message: 'Sign and submit to POST /drift/account/set-delegate',
        transaction: serializedTx,
        agentWallet: agentWallet.publicKey,
      };
    } catch (error) {
      console.error('Get delegation tx error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  @Get('account/revoke-delegation-tx')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Get unsigned revoke transaction',
    description: 'Returns an unsigned transaction to REMOVE agent wallet authorization. Sign and submit DIRECTLY to Solana. See docs/FRONTEND_INTEGRATION.md',
  })
  async getRevokeDelegationTx(@CurrentUser() user: Payload) {
    try {
      const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
      if (!agentWallet) {
        return {
          success: false,
          error: 'NO_AGENT_WALLET',
          message: 'No agent wallet found',
        };
      }

      // Build transaction to set delegate to null (revoke)
      const serializedTx = await this.driftService.buildSetDelegateTransaction(
        user.walletAddress,
        '11111111111111111111111111111111', // System program ID = no delegate
      );

      return {
        success: true,
        message: 'Sign and submit to revoke authorization. Agent wallet will no longer be able to trade.',
        transaction: serializedTx,
        warning: 'After revoking, you must delegate again before trading.',
      };
    } catch (error) {
      console.error('Get revoke tx error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  @Get('account/initialize-tx')
  @ApiTags('Drift Account')
  @ApiOperation({
    summary: 'Get unsigned initialize transaction',
    description: 'Returns an unsigned transaction to create Drift account. Sign and submit DIRECTLY to Solana. See docs/FRONTEND_INTEGRATION.md',
  })
  async getInitializeTx(@CurrentUser() user: Payload) {
    try {
      const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
      if (!agentWallet) {
        return {
          success: false,
          error: 'NO_AGENT_WALLET',
          message: 'Create an agent wallet first: POST /agent-wallets',
          setupRequired: true,
        };
      }

      // Check if already has account
      const hasAccount = await this.driftService.checkMainWalletDriftBalance(user.walletAddress);
      if (hasAccount.hasDriftAccount) {
        return {
          success: true,
          message: 'Drift account already exists',
          alreadyInitialized: true,
        };
      }

      // Return unsigned transaction
      const serializedTx = await this.driftService.buildInitializeAccountTransaction(
        user.walletAddress,
        agentWallet.publicKey,
      );

      return {
        success: true,
        message: 'Sign this transaction to create your Drift account (~0.002 SOL). Submit DIRECTLY to Solana.',
        transaction: serializedTx,
      };
    } catch (error) {
      console.error('Initialize account error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  // ==================== Drift Perp Trading ====================

  @Get('positions')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Get open positions',
    description: 'Returns all open perpetual positions',
  })
  @ApiResponse({ status: 200, description: 'Positions retrieved' })
  async getPositions(@CurrentUser() user: Payload) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      const positions = await this.driftService.getPositions(driftClient);
      await driftClient.unsubscribe();
      return { positions };
    } catch (error) {
      // Return empty array instead of error
      console.error('Positions error:', error.message);
      return { positions: [] };
    }
  }

  @Get('orders')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Get open orders',
    description: 'Returns all open orders',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getOrders(@CurrentUser() user: Payload) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      const orders = await this.driftService.getOrders(driftClient);
      await driftClient.unsubscribe();
      return { orders };
    } catch (error) {
      // Return empty array instead of error
      console.error('Orders error:', error.message);
      return { orders: [] };
    }
  }

  @Post('order/place/market')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Place market order',
    description: 'Place a market order - executes immediately at best available price',
  })
  @ApiResponse({ status: 200, description: 'Market order placed' })
  async placeMarketOrder(@CurrentUser() user: Payload, @Body() dto: MarketOrderDto) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);

      const txSig = await this.driftService.placeMarketOrder(driftClient, {
        marketIndex: dto.marketIndex,
        direction: dto.direction as PositionDirection,
        baseAssetAmount: new BN(dto.baseAssetAmount),
      });

      await driftClient.unsubscribe();
      return { success: true, signature: txSig, orderType: 'MARKET' };
    } catch (error) {
      return this.handleOrderError(error);
    }
  }

  @Post('order/place/limit')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Place limit order',
    description: 'Place a limit order - executes at specified price or better',
  })
  @ApiResponse({ status: 200, description: 'Limit order placed' })
  async placeLimitOrder(@CurrentUser() user: Payload, @Body() dto: LimitOrderDto) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);

      const txSig = await this.driftService.placeLimitOrder(driftClient, {
        marketIndex: dto.marketIndex,
        direction: dto.direction as PositionDirection,
        baseAssetAmount: new BN(dto.baseAssetAmount),
        price: new BN(dto.price),
      });

      await driftClient.unsubscribe();
      return { success: true, signature: txSig, orderType: 'LIMIT' };
    } catch (error) {
      return this.handleOrderError(error);
    }
  }

  @Post('order/cancel')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel a specific order by ID',
  })
  async cancelOrder(@CurrentUser() user: Payload, @Body() dto: CancelOrderDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.cancelOrder(driftClient, {
      orderId: dto.orderId,
    });
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  @Post('orders/cancel-all')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Cancel all orders',
    description: 'Cancel all open orders',
  })
  async cancelAllOrders(@CurrentUser() user: Payload) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.cancelAllOrders(driftClient);
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  @Post('order/take-profit')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Place Take Profit order',
    description: 'Place a take profit order (reduces position when price hits target)',
  })
  async placeTakeProfit(@CurrentUser() user: Payload, @Body() dto: PlaceTpSlDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.placeTpSlOrder(
      driftClient,
      {
        marketIndex: dto.marketIndex,
        direction: dto.direction as PositionDirection,
        baseAssetAmount: new BN(dto.baseAssetAmount),
        triggerPrice: new BN(dto.triggerPrice),
        limitPrice: dto.limitPrice ? new BN(dto.limitPrice) : undefined,
      },
      false, // Take Profit
    );
    await driftClient.unsubscribe();
    return { success: true, signature: txSig, type: 'TAKE_PROFIT' };
  }

  @Post('order/stop-loss')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Place Stop Loss order',
    description: 'Place a stop loss order (reduces position when price hits stop)',
  })
  async placeStopLoss(@CurrentUser() user: Payload, @Body() dto: PlaceTpSlDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.placeTpSlOrder(
      driftClient,
      {
        marketIndex: dto.marketIndex,
        direction: dto.direction as PositionDirection,
        baseAssetAmount: new BN(dto.baseAssetAmount),
        triggerPrice: new BN(dto.triggerPrice),
        limitPrice: dto.limitPrice ? new BN(dto.limitPrice) : undefined,
      },
      true, // Stop Loss
    );
    await driftClient.unsubscribe();
    return { success: true, signature: txSig, type: 'STOP_LOSS' };
  }

  // ==================== Position Management ====================

  @Post('position/close/market')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Close position at market price',
    description: 'Close an open position at the current market price. Automatically determines the correct size and direction. Uses reduceOnly to prevent accidental position reversal.',
  })
  async closePositionMarket(@CurrentUser() user: Payload, @Body() dto: ClosePositionMarketDto) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      
      const result = await this.driftService.closePositionMarket(driftClient, dto.marketIndex);
      
      await driftClient.unsubscribe();
      return {
        success: true,
        signature: result.signature,
        closedAmount: result.closedAmount,
        marketIndex: dto.marketIndex,
        type: 'CLOSE_MARKET',
      };
    } catch (error) {
      return this.handleOrderError(error);
    }
  }

  @Post('position/close/limit')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Close position at limit price',
    description: 'Close an open position at a specified limit price. Automatically determines the correct size and direction. Uses reduceOnly to prevent accidental position reversal.',
  })
  async closePositionLimit(@CurrentUser() user: Payload, @Body() dto: ClosePositionLimitDto) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      
      const result = await this.driftService.closePositionLimit(
        driftClient,
        dto.marketIndex,
        new BN(dto.price),
      );
      
      await driftClient.unsubscribe();
      return {
        success: true,
        signature: result.signature,
        closedAmount: result.closedAmount,
        marketIndex: dto.marketIndex,
        limitPrice: dto.price,
        type: 'CLOSE_LIMIT',
      };
    } catch (error) {
      return this.handleOrderError(error);
    }
  }

  @Post('positions/close-all')
  @ApiTags('Drift Perp Trading')
  @ApiOperation({
    summary: 'Close all positions at market price',
    description: 'Close all open positions at market price. Useful for emergency exits or end-of-day closes.',
  })
  async closeAllPositions(@CurrentUser() user: Payload) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
      
      const result = await this.driftService.closeAllPositions(driftClient);
      
      await driftClient.unsubscribe();
      return {
        success: true,
        signatures: result.signatures,
        closedPositions: result.closedPositions,
        type: 'CLOSE_ALL_MARKET',
      };
    } catch (error) {
      return this.handleOrderError(error);
    }
  }

  // ==================== Drift Account Fund ====================

  @Post('deposit')
  @ApiTags('Drift Account Fund')
  @ApiOperation({
    summary: 'Deposit collateral (with auto-initialization)',
    description: 'Deposit USDC or SOL (auto-swapped to USDC) into Drift account. If Drift account does not exist, it will be initialized automatically (costs ~0.002 SOL). Minimum $5.',
  })
  async deposit(@CurrentUser() user: Payload, @Body() dto: DepositDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const result = await this.driftService.deposit(driftClient, user.id, {
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      reduceOnly: dto.reduceOnly,
    });
    await driftClient.unsubscribe();
    return {
      success: true,
      signature: result.signature,
      swapSignature: result.swapSignature,
      initSignature: result.initSignature,
      delegateSignature: result.delegateSignature,
      isFirstDeposit: result.isFirstDeposit,
      depositedAmount: result.depositedAmount,
      message: result.message,
    };
  }

  @Post('withdraw')
  @ApiTags('Drift Account Fund')
  @ApiOperation({
    summary: 'Withdraw collateral',
    description: 'Withdraw USDC or other collateral from Drift account',
  })
  async withdraw(@CurrentUser() user: Payload, @Body() dto: WithdrawDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.withdraw(driftClient, {
      marketIndex: dto.marketIndex,
      amount: new BN(dto.amount),
      reduceOnly: dto.reduceOnly,
    });
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  // ==================== Market Info ====================

  @Get('markets')
  @ApiTags('Market Info')
  @ApiOperation({
    summary: 'Get available markets',
    description: 'Returns all available perpetual markets',
  })
  async getMarkets() {
    const markets = this.driftService.getMarkets();
    return { markets };
  }

  @Get('markets/:marketIndex/price')
  @ApiTags('Market Info')
  @ApiOperation({
    summary: 'Get market price',
    description: 'Get current oracle price for a market',
  })
  @ApiParam({ name: 'marketIndex', description: 'Market index' })
  async getMarketPrice(
    @CurrentUser() user: Payload,
    @Param('marketIndex', ParseIntPipe) marketIndex: number,
  ) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const price = await this.driftService.getMarketPrice(driftClient, marketIndex);
    await driftClient.unsubscribe();
    return { marketIndex, price };
  }

  // ==================== Error Handler ====================

  private handleOrderError(error: any) {
    console.error('Order error:', error);
    
    if (error.message?.includes('User account not found') || error.message?.includes('does not have a Drift account')) {
      return {
        success: false,
        error: 'NO_DRIFT_ACCOUNT',
        message: 'You do not have a Drift account. Please deposit first to initialize.',
        setupRequired: true,
      };
    }
    if (error.message === 'Agent wallet not found for user') {
      return {
        success: false,
        error: 'NO_AGENT_WALLET',
        message: 'Please create an agent wallet first',
        setupRequired: true,
      };
    }
    if (error.message === 'Agent wallet is not delegated on Drift') {
      return {
        success: false,
        error: 'NOT_DELEGATED',
        message: 'Please delegate your agent wallet on Drift Protocol',
        setupRequired: true,
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to place order',
    };
  }
}
