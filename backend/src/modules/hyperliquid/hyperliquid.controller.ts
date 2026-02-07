import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HyperliquidService } from './services/hyperliquid.service';
import { HyperliquidWalletsService } from '../hyperliquid-wallets/services/hyperliquid-wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Payload } from '../auth/auth.interface';
import { PlaceOrderDto, CancelOrderDto, UpdateLeverageDto } from './dto';

@ApiTags('Hyperliquid Trading')
@Controller('hyperliquid')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HyperliquidController {
  constructor(
    private readonly hyperliquidService: HyperliquidService,
    private readonly walletsService: HyperliquidWalletsService,
  ) {}

  // ==================== MARKET DATA ====================

  @Get('markets')
  @ApiOperation({ summary: 'Get available perpetual markets' })
  async getMarkets() {
    return this.hyperliquidService.getMarkets();
  }

  @Get('markets/:coin/price')
  @ApiOperation({ summary: 'Get current price for a coin' })
  async getPrice(@Param('coin') coin: string) {
    return this.hyperliquidService.getPrice(coin);
  }

  // ==================== ACCOUNT ====================

  @Get('account')
  @ApiOperation({ summary: 'Get my account summary' })
  async getAccount(@CurrentUser() user: Payload) {
    try {
      const summary = await this.hyperliquidService.getAccountSummary(user.id);
      return { success: true, account: summary };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to fetch account. Make sure you have a wallet and it is approved on Hyperliquid.',
        error: error.message,
      };
    }
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get my open positions' })
  async getPositions(@CurrentUser() user: Payload) {
    try {
      const positions = await this.hyperliquidService.getPositions(user.id);
      return { success: true, positions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get my open orders' })
  async getOpenOrders(@CurrentUser() user: Payload) {
    try {
      const orders = await this.hyperliquidService.getOpenOrders(user.id);
      return { success: true, orders };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== TRADING ====================

  @Post('orders')
  @ApiOperation({ summary: 'Place an order' })
  async placeOrder(@CurrentUser() user: Payload, @Body() dto: PlaceOrderDto) {
    try {
      const result = await this.hyperliquidService.placeOrder(user.id, {
        coin: dto.coin,
        side: dto.side,
        size: dto.size,
        price: dto.price,
        orderType: dto.orderType,
        timeInForce: dto.timeInForce,
        reduceOnly: dto.reduceOnly,
        triggerPrice: dto.triggerPrice,
      });
      return { success: true, result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('orders/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(@CurrentUser() user: Payload, @Body() dto: CancelOrderDto) {
    try {
      const result = await this.hyperliquidService.cancelOrder(user.id, dto.coin, dto.orderId);
      return { success: true, result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('orders/cancel-all')
  @ApiOperation({ summary: 'Cancel all orders' })
  @ApiQuery({ name: 'coin', required: false })
  async cancelAllOrders(@CurrentUser() user: Payload, @Query('coin') coin?: string) {
    try {
      const result = await this.hyperliquidService.cancelAllOrders(user.id, coin);
      return { success: true, result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== LEVERAGE ====================

  @Post('leverage')
  @ApiOperation({ summary: 'Update leverage' })
  async updateLeverage(@CurrentUser() user: Payload, @Body() dto: UpdateLeverageDto) {
    try {
      const result = await this.hyperliquidService.updateLeverage(
        user.id,
        dto.coin,
        dto.leverage,
        dto.isCross,
      );
      return { success: true, result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
