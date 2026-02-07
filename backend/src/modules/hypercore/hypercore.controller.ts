import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HypercoreService } from './services/hypercore.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Payload } from '../auth/auth.interface';
import {
  CancelOrderDto,
  OpenLimitOrderDto,
  OpenMarketOrderDto,
  CloseLimitOrderDto,
  CloseMarketOrderDto,
  TakeProfitOrderDto,
  StopLossOrderDto,
  TwapDto,
  CloseAllPositionsDto,
  SetIsolatedModeDto,
  UpdateLeverageDto,
} from './dto';

@ApiTags('Hypercore Trading')
@Controller('hypercore')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HypercoreController {
  constructor(private readonly hypercoreService: HypercoreService) {}

  // ==================== MARKET DATA ====================

  @Get('markets')
  @ApiOperation({ summary: 'Get available perpetual markets' })
  async getMarkets() {
    return this.hypercoreService.getMarkets();
  }

  @Get('markets/:coin/price')
  @ApiOperation({ summary: 'Get current price for a coin' })
  async getPrice(@Param('coin') coin: string) {
    return this.hypercoreService.getPrice(coin);
  }

  // ==================== ACCOUNT ====================

  @Get('account')
  @ApiOperation({ summary: 'Get my account summary' })
  async getAccount(@CurrentUser() user: Payload) {
    return this.hypercoreService.getAccountSummary(user.id);
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get all my positions' })
  async getPositions(@CurrentUser() user: Payload) {
    return this.hypercoreService.getPositions(user.id);
  }

  @Get('positions/:coin')
  @ApiOperation({ summary: 'Get position for specific coin' })
  async getPositionForCoin(@CurrentUser() user: Payload, @Param('coin') coin: string) {
    return this.hypercoreService.getPositionForCoin(user.id, coin);
  }

  @Get('orders/open')
  @ApiOperation({ summary: 'Get my open orders' })
  async getOpenOrders(@CurrentUser() user: Payload) {
    return this.hypercoreService.getOpenOrders(user.id);
  }

  // ==================== OPEN POSITION ORDERS ====================

  @Post('orders/limit/open')
  @ApiOperation({
    summary: 'Open limit order',
    description: 'Places a limit order to open a new position or increase existing position',
  })
  async openLimitOrder(@CurrentUser() user: Payload, @Body() dto: OpenLimitOrderDto) {
    return this.hypercoreService.openLimitOrder(user.id, dto);
  }

  @Post('orders/market/open')
  @ApiOperation({
    summary: 'Open market order',
    description: 'Executes a market order to open a new position or increase existing position',
  })
  async openMarketOrder(@CurrentUser() user: Payload, @Body() dto: OpenMarketOrderDto) {
    return this.hypercoreService.openMarketOrder(user.id, dto);
  }

  // ==================== CLOSE POSITION ORDERS ====================

  @Post('orders/limit/close')
  @ApiOperation({
    summary: 'Close limit order',
    description: 'Places a limit order to close/reduce existing position. Auto-detects position direction.',
  })
  async closeLimitOrder(@CurrentUser() user: Payload, @Body() dto: CloseLimitOrderDto) {
    return this.hypercoreService.closeLimitOrder(user.id, dto);
  }

  @Post('orders/market/close')
  @ApiOperation({
    summary: 'Close market order',
    description: 'Executes a market order to close/reduce existing position. Auto-detects position direction.',
  })
  async closeMarketOrder(@CurrentUser() user: Payload, @Body() dto: CloseMarketOrderDto) {
    return this.hypercoreService.closeMarketOrder(user.id, dto);
  }

  // ==================== TP/SL ORDERS ====================

  @Post('orders/take-profit')
  @ApiOperation({
    summary: 'Place Take Profit order',
    description: 'Places a TP trigger order. Cancels existing TP orders for the same coin.',
  })
  async placeTakeProfit(@CurrentUser() user: Payload, @Body() dto: TakeProfitOrderDto) {
    return this.hypercoreService.placeTakeProfitOrder(user.id, dto);
  }

  @Post('orders/stop-loss')
  @ApiOperation({
    summary: 'Place Stop Loss order',
    description: 'Places a SL trigger order. Cancels existing SL orders for the same coin.',
  })
  async placeStopLoss(@CurrentUser() user: Payload, @Body() dto: StopLossOrderDto) {
    return this.hypercoreService.placeStopLossOrder(user.id, dto);
  }

  // ==================== CANCEL ORDERS ====================

  @Post('orders/cancel')
  @ApiOperation({ summary: 'Cancel specific order by ID' })
  async cancelOrder(@CurrentUser() user: Payload, @Body() dto: CancelOrderDto) {
    return this.hypercoreService.cancelOrder(user.id, dto);
  }

  @Post('orders/cancel-all')
  @ApiOperation({ summary: 'Cancel all open orders' })
  async cancelAllOrders(@CurrentUser() user: Payload) {
    return this.hypercoreService.cancelAllOrders(user.id);
  }

  // ==================== CLOSE ALL POSITIONS ====================

  @Post('positions/close-all')
  @ApiOperation({
    summary: 'Close all positions',
    description: 'Closes all open positions using market or limit at mid price',
  })
  async closeAllPositions(@CurrentUser() user: Payload, @Body() dto: CloseAllPositionsDto) {
    return this.hypercoreService.closeAllPositions(user.id, dto.closeType);
  }

  // ==================== LEVERAGE & MARGIN ====================

  @Post('leverage')
  @ApiOperation({
    summary: 'Update leverage',
    description: 'Updates leverage for a specific trading pair (isolated margin)',
  })
  async updateLeverage(@CurrentUser() user: Payload, @Body() dto: UpdateLeverageDto) {
    return this.hypercoreService.updateLeverage(user.id, dto);
  }

  @Post('margin/isolated')
  @ApiOperation({
    summary: 'Switch to isolated margin',
    description: 'Switches asset to isolated margin mode with max leverage',
  })
  async setIsolatedMode(@CurrentUser() user: Payload, @Body() dto: SetIsolatedModeDto) {
    return this.hypercoreService.setIsolatedMode(user.id, dto);
  }

  // ==================== TWAP ====================

  @Post('orders/twap')
  @ApiOperation({
    summary: 'Create TWAP plan',
    description: 'Creates a TWAP execution plan (simplified - returns plan only)',
  })
  async twap(@CurrentUser() user: Payload, @Body() dto: TwapDto) {
    return this.hypercoreService.twap(user.id, dto);
  }
}
