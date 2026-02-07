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
  @ApiResponse({ status: 200, description: 'List of available markets' })
  async getMarkets() {
    return this.hyperliquidService.getMarkets();
  }

  @Get('markets/:coin/price')
  @ApiOperation({ summary: 'Get current price for a coin' })
  @ApiResponse({ status: 200, description: 'Current mid price' })
  async getPrice(@Param('coin') coin: string) {
    return this.hyperliquidService.getPrice(coin);
  }

  // ==================== ACCOUNT ====================

  @Get('account')
  @ApiOperation({
    summary: 'Get account summary',
    description: 'Returns account value, margin usage, and PnL summary',
  })
  @ApiResponse({ status: 200, description: 'Account summary' })
  async getAccount(@CurrentUser() user: Payload) {
    const wallet = await this.walletsService.getWalletSafe(user.id);
    
    if (!wallet) {
      return {
        hasWallet: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const summary = await this.hyperliquidService.getAccountSummary(wallet.masterAddress);
    
    return {
      hasWallet: true,
      account: summary,
    };
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get open positions' })
  @ApiResponse({ status: 200, description: 'List of open positions' })
  async getPositions(@CurrentUser() user: Payload) {
    const wallet = await this.walletsService.getWalletSafe(user.id);
    
    if (!wallet) {
      return {
        hasWallet: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const positions = await this.hyperliquidService.getPositions(wallet.masterAddress);
    
    return {
      hasWallet: true,
      positions,
    };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get open orders' })
  @ApiResponse({ status: 200, description: 'List of open orders' })
  async getOpenOrders(@CurrentUser() user: Payload) {
    const wallet = await this.walletsService.getWalletSafe(user.id);
    
    if (!wallet) {
      return {
        hasWallet: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const orders = await this.hyperliquidService.getOpenOrders(wallet.masterAddress);
    
    return {
      hasWallet: true,
      orders,
    };
  }

  // ==================== TRADING ====================

  @Post('orders')
  @ApiOperation({
    summary: 'Place an order',
    description: 'Place a market, limit, stop-market, or stop-limit order',
  })
  @ApiResponse({ status: 200, description: 'Order placed successfully' })
  async placeOrder(
    @CurrentUser() user: Payload,
    @Body() dto: PlaceOrderDto,
  ) {
    const wallet = await this.walletsService.getWalletByUserId(user.id);
    
    if (!wallet) {
      return {
        success: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const result = await this.hyperliquidService.placeOrder(wallet.id, {
      coin: dto.coin,
      side: dto.side,
      size: dto.size,
      price: dto.price,
      orderType: dto.orderType,
      timeInForce: dto.timeInForce,
      reduceOnly: dto.reduceOnly,
      triggerPrice: dto.triggerPrice,
    });

    return {
      success: true,
      result,
    };
  }

  @Post('orders/cancel')
  @ApiOperation({ summary: 'Cancel an order by ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancelOrder(
    @CurrentUser() user: Payload,
    @Body() dto: CancelOrderDto,
  ) {
    const wallet = await this.walletsService.getWalletByUserId(user.id);
    
    if (!wallet) {
      return {
        success: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const result = await this.hyperliquidService.cancelOrder(
      wallet.id,
      dto.coin,
      dto.orderId,
    );

    return {
      success: true,
      result,
    };
  }

  @Post('orders/cancel-all')
  @ApiOperation({ summary: 'Cancel all orders' })
  @ApiQuery({ name: 'coin', required: false, description: 'Cancel orders for specific coin only' })
  @ApiResponse({ status: 200, description: 'Orders cancelled' })
  async cancelAllOrders(
    @CurrentUser() user: Payload,
    @Query('coin') coin?: string,
  ) {
    const wallet = await this.walletsService.getWalletByUserId(user.id);
    
    if (!wallet) {
      return {
        success: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const result = await this.hyperliquidService.cancelAllOrders(wallet.id, coin);

    return {
      success: true,
      result,
    };
  }

  // ==================== LEVERAGE ====================

  @Post('leverage')
  @ApiOperation({ summary: 'Update leverage for a coin' })
  @ApiResponse({ status: 200, description: 'Leverage updated' })
  async updateLeverage(
    @CurrentUser() user: Payload,
    @Body() dto: UpdateLeverageDto,
  ) {
    const wallet = await this.walletsService.getWalletByUserId(user.id);
    
    if (!wallet) {
      return {
        success: false,
        message: 'No Hyperliquid wallet found',
      };
    }

    const result = await this.hyperliquidService.updateLeverage(
      wallet.id,
      dto.coin,
      dto.leverage,
      dto.isCross,
    );

    return {
      success: true,
      result,
    };
  }
}
