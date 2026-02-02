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
import { PlaceOrderDto, PlaceTpSlDto, CancelOrderDto, DepositDto, WithdrawDto } from './dto';
import { PositionDirection, OrderType, BN } from '@drift-labs/sdk';
import { PublicKey } from '@solana/web3.js';

@ApiTags('Drift Trading')
@Controller('drift')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriftController {
  constructor(
    private readonly driftService: DriftService,
    private readonly agentWalletsService: AgentWalletsService,
  ) {}

  // ==================== Account Management ====================

  @Get('account')
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
  @ApiOperation({
    summary: 'Get account activation status',
    description: 'Returns activation status, agent wallet SOL balance (for gas), and user Drift USDC balance',
  })
  async getAccountStatus(@CurrentUser() user: Payload) {
    const status = await this.driftService.getAccountStatus(user.id, user.walletAddress);
    return status;
  }

  @Get('account/external-balance')
  @ApiOperation({
    summary: 'Check main wallet Drift balance',
    description: 'Checks if the user\'s main wallet already has USDC deposited in Drift Protocol (for users who used Drift before TradeClub)',
  })
  async checkExternalBalance(@CurrentUser() user: Payload) {
    const balance = await this.driftService.checkMainWalletDriftBalance(user.walletAddress);
    return balance;
  }

  @Post('account/set-delegate')
  @ApiOperation({
    summary: 'Set agent wallet as delegate',
    description: 'Submit a signed delegation transaction to authorize the agent wallet.',
  })
  async setDelegate(
    @CurrentUser() user: Payload,
    @Body('signedTransaction') signedTransaction: string,
  ) {
    try {
      if (!signedTransaction) {
        return {
          success: false,
          error: 'MISSING_SIGNED_TRANSACTION',
          message: 'Please provide signedTransaction (base64 encoded signed transaction)',
          help: '1. Get unsigned tx from GET /drift/account/delegation-tx, 2. Sign with your wallet, 3. Submit here',
        };
      }

      const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
      if (!agentWallet) {
        return {
          success: false,
          error: 'NO_AGENT_WALLET',
          message: 'Create an agent wallet first: POST /agent-wallets',
          setupRequired: true,
        };
      }

      // Submit the signed transaction
      const txSig = await this.driftService.submitSignedTransaction(signedTransaction);

      // Mark as delegated in database
      if (!agentWallet.isDelegated) {
        await this.agentWalletsService.markAsDelegated(agentWallet.id, 0);
      }

      return {
        success: true,
        message: 'Agent wallet authorized to trade on your behalf',
        signature: txSig,
        delegate: agentWallet.publicKey,
      };
    } catch (error) {
      console.error('Set delegate error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  @Post('account/revoke-delegate')
  @ApiOperation({
    summary: 'Revoke agent wallet delegation',
    description: 'Submit a signed transaction to remove agent wallet authorization. This prevents the agent from trading on your behalf.',
  })
  async revokeDelegate(
    @CurrentUser() user: Payload,
    @Body('signedTransaction') signedTransaction: string,
  ) {
    try {
      if (!signedTransaction) {
        return {
          success: false,
          error: 'MISSING_SIGNED_TRANSACTION',
          message: 'Get unsigned tx from GET /drift/account/revoke-delegation-tx, sign it, and submit here',
        };
      }

      const agentWallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
      if (!agentWallet) {
        return {
          success: false,
          error: 'NO_AGENT_WALLET',
          message: 'No agent wallet found',
        };
      }

      // Submit the signed transaction
      const txSig = await this.driftService.submitSignedTransaction(signedTransaction);

      // Mark as NOT delegated in database
      await this.agentWalletsService.revokeDelegation(agentWallet.id);

      return {
        success: true,
        message: 'Agent wallet authorization revoked. It can no longer trade on your behalf.',
        signature: txSig,
      };
    } catch (error) {
      console.error('Revoke delegate error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  @Get('account/delegation-tx')
  @ApiOperation({
    summary: 'Get unsigned delegation transaction',
    description: 'Returns an unsigned transaction to authorize the agent wallet. Sign and submit to POST /account/set-delegate',
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
  @ApiOperation({
    summary: 'Get unsigned revoke transaction',
    description: 'Returns an unsigned transaction to REMOVE agent wallet authorization. Sign and submit to POST /account/set-delegate with the signed transaction',
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

  @Post('account/initialize')
  @ApiOperation({
    summary: 'Initialize Drift account',
    description: 'Creates a new Drift account for users who dont have one. This is a 2-step flow: 1) Call this to get unsigned tx, 2) Sign and submit back here with signedTransaction',
  })
  async initializeDriftAccount(
    @CurrentUser() user: Payload,
    @Body('signedTransaction') signedTransaction?: string,
  ) {
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

      // If no signed transaction provided, return unsigned one
      if (!signedTransaction) {
        const serializedTx = await this.driftService.buildInitializeAccountTransaction(
          user.walletAddress,
          agentWallet.publicKey,
        );

        return {
          success: true,
          message: 'Sign this transaction to create your Drift account (~0.002 SOL)',
          transaction: serializedTx,
          nextStep: 'Sign and submit back to this endpoint with signedTransaction',
        };
      }

      // Submit the signed transaction
      const txSig = await this.driftService.submitSignedTransaction(signedTransaction);

      // Mark agent wallet as activated
      await this.agentWalletsService.markAsActivated(agentWallet.id);

      return {
        success: true,
        message: 'Drift account created successfully!',
        signature: txSig,
        nextSteps: {
          delegate: 'GET /drift/account/delegation-tx then POST /drift/account/set-delegate',
          deposit: 'POST /drift/deposit',
        },
      };
    } catch (error) {
      console.error('Initialize account error:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }

  // ==================== Positions ====================

  @Get('positions')
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

  // ==================== Orders ====================

  @Get('orders')
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

  @Post('order/place')
  @ApiOperation({
    summary: 'Place order',
    description: 'Place a new perpetual order (market or limit)',
  })
  @ApiResponse({ status: 200, description: 'Order placed' })
  async placeOrder(@CurrentUser() user: Payload, @Body() dto: PlaceOrderDto) {
    try {
      const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);

      const txSig = await this.driftService.placeOrder(driftClient, {
        marketIndex: dto.marketIndex,
        direction: dto.direction as PositionDirection,
        baseAssetAmount: new BN(dto.baseAssetAmount),
        orderType: dto.orderType as OrderType,
        price: dto.price ? new BN(dto.price) : undefined,
        triggerPrice: dto.triggerPrice ? new BN(dto.triggerPrice) : undefined,
        reduceOnly: dto.reduceOnly,
        postOnly: dto.postOnly,
      });

      await driftClient.unsubscribe();
      return { success: true, signature: txSig };
    } catch (error) {
      console.error('Place order error:', error);
      
      // Handle specific error cases
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

  @Post('order/cancel')
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
  @ApiOperation({
    summary: 'Place Take Profit order',
    description: 'Place a take profit order (reduces position when price hits target)',
  })
  async placeTakeProfit(@CurrentUser() user: Payload, @Body() dto: PlaceTpSlDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.placeTpSlOrder(driftClient, {
      marketIndex: dto.marketIndex,
      direction: dto.direction as PositionDirection,
      baseAssetAmount: new BN(dto.baseAssetAmount),
      triggerPrice: new BN(dto.triggerPrice),
      limitPrice: dto.limitPrice ? new BN(dto.limitPrice) : undefined,
      isStopLoss: false,
    });
    await driftClient.unsubscribe();
    return { success: true, signature: txSig, type: 'TAKE_PROFIT' };
  }

  @Post('order/stop-loss')
  @ApiOperation({
    summary: 'Place Stop Loss order',
    description: 'Place a stop loss order (reduces position when price hits stop)',
  })
  async placeStopLoss(@CurrentUser() user: Payload, @Body() dto: PlaceTpSlDto) {
    const driftClient = await this.driftService.initializeForUser(user.id, user.walletAddress);
    const txSig = await this.driftService.placeTpSlOrder(driftClient, {
      marketIndex: dto.marketIndex,
      direction: dto.direction as PositionDirection,
      baseAssetAmount: new BN(dto.baseAssetAmount),
      triggerPrice: new BN(dto.triggerPrice),
      limitPrice: dto.limitPrice ? new BN(dto.limitPrice) : undefined,
      isStopLoss: true,
    });
    await driftClient.unsubscribe();
    return { success: true, signature: txSig, type: 'STOP_LOSS' };
  }

  // ==================== Collateral Management ====================

  @Post('deposit')
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

  // ==================== Markets ====================

  @Get('markets')
  @ApiOperation({
    summary: 'Get available markets',
    description: 'Returns all available perpetual markets',
  })
  async getMarkets() {
    const markets = this.driftService.getMarkets();
    return { markets };
  }

  @Get('markets/:marketIndex/price')
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
}
