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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Payload } from '../auth/auth.interface';
import { PlaceOrderDto, CancelOrderDto, DepositDto, WithdrawDto } from './dto';
import { PositionDirection, OrderType, BN } from '@drift-labs/sdk';

@ApiTags('Drift Trading')
@Controller('drift')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriftController {
  constructor(private readonly driftService: DriftService) {}

  // ==================== Account Management ====================

  @Get('account')
  @ApiOperation({
    summary: 'Get Drift account info',
    description: 'Returns collateral, margin, leverage, and other account metrics',
  })
  @ApiResponse({ status: 200, description: 'Account info retrieved' })
  async getAccountInfo(@CurrentUser() user: Payload) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const info = await this.driftService.getAccountInfo(driftClient);
    await driftClient.unsubscribe();
    return { info };
  }

  @Post('account/initialize')
  @ApiOperation({
    summary: 'Initialize Drift account',
    description: 'Creates a new Drift user account (required before trading)',
  })
  @ApiResponse({ status: 200, description: 'Account initialized' })
  async initializeAccount(@CurrentUser() user: Payload) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const txSig = await this.driftService.initializeDriftAccount(driftClient);
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  // ==================== Positions ====================

  @Get('positions')
  @ApiOperation({
    summary: 'Get open positions',
    description: 'Returns all open perpetual positions',
  })
  @ApiResponse({ status: 200, description: 'Positions retrieved' })
  async getPositions(@CurrentUser() user: Payload) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const positions = await this.driftService.getPositions(driftClient);
    await driftClient.unsubscribe();
    return { positions };
  }

  @Get('positions/:marketIndex')
  @ApiOperation({
    summary: 'Get position by market',
    description: 'Returns position for a specific market',
  })
  @ApiParam({ name: 'marketIndex', description: 'Market index' })
  async getPositionByMarket(
    @CurrentUser() user: Payload,
    @Param('marketIndex', ParseIntPipe) marketIndex: number,
  ) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const positions = await this.driftService.getPositions(driftClient);
    const position = positions.find((p) => p.marketIndex === marketIndex);
    await driftClient.unsubscribe();
    return { position: position || null };
  }

  // ==================== Orders ====================

  @Get('orders')
  @ApiOperation({
    summary: 'Get open orders',
    description: 'Returns all open orders',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getOrders(@CurrentUser() user: Payload) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const orders = await this.driftService.getOrders(driftClient);
    await driftClient.unsubscribe();
    return { orders };
  }

  @Post('orders')
  @ApiOperation({
    summary: 'Place order',
    description: 'Place a new perpetual order (market or limit)',
  })
  @ApiResponse({ status: 200, description: 'Order placed' })
  async placeOrder(@CurrentUser() user: Payload, @Body() dto: PlaceOrderDto) {
    const driftClient = await this.driftService.initializeForUser(user.id);

    const txSig = await this.driftService.placeOrder(driftClient, {
      marketIndex: dto.marketIndex,
      direction: dto.direction as PositionDirection,
      baseAssetAmount: new BN(dto.baseAssetAmount),
      orderType: dto.orderType as OrderType,
      price: dto.price ? new BN(dto.price) : undefined,
      triggerPrice: dto.triggerPrice ? new BN(dto.triggerPrice) : undefined,
      reduceOnly: dto.reduceOnly,
      postOnly: dto.postOnly,
      immediateOrCancel: dto.immediateOrCancel,
    });

    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  @Post('orders/cancel')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel a specific order by ID',
  })
  async cancelOrder(@CurrentUser() user: Payload, @Body() dto: CancelOrderDto) {
    const driftClient = await this.driftService.initializeForUser(user.id);
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
    const driftClient = await this.driftService.initializeForUser(user.id);
    const txSig = await this.driftService.cancelAllOrders(driftClient);
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  // ==================== Collateral Management ====================

  @Post('deposit')
  @ApiOperation({
    summary: 'Deposit collateral',
    description: 'Deposit USDC or other collateral into Drift account',
  })
  async deposit(@CurrentUser() user: Payload, @Body() dto: DepositDto) {
    const driftClient = await this.driftService.initializeForUser(user.id);
    const txSig = await this.driftService.deposit(driftClient, {
      marketIndex: dto.marketIndex,
      amount: new BN(dto.amount),
      reduceOnly: dto.reduceOnly,
    });
    await driftClient.unsubscribe();
    return { success: true, signature: txSig };
  }

  @Post('withdraw')
  @ApiOperation({
    summary: 'Withdraw collateral',
    description: 'Withdraw USDC or other collateral from Drift account',
  })
  async withdraw(@CurrentUser() user: Payload, @Body() dto: WithdrawDto) {
    const driftClient = await this.driftService.initializeForUser(user.id);
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
    const driftClient = await this.driftService.initializeForUser(user.id);
    const price = await this.driftService.getMarketPrice(driftClient, marketIndex);
    await driftClient.unsubscribe();
    return { marketIndex, price };
  }
}
