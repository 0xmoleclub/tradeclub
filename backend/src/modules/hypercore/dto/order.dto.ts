import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';

export enum TimeInForce {
  GTC = 'Gtc',
  IOC = 'Ioc',
  ALO = 'Alo',
}

export enum CloseAllType {
  MARKET_CLOSE = 'marketClose',
  LIMIT_CLOSE_AT_MID_PRICE = 'limitCloseAtMidPrice',
}

// ==================== CANCEL ORDER ====================

export class CancelOrderDto {
  @ApiProperty({ description: 'Trading pair symbol (e.g., "BTC", "ETH")', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Order ID to cancel', example: 39961606288 })
  @IsNumber()
  @Min(0)
  oid: number;
}

// ==================== OPEN POSITION ORDERS ====================

export class OpenLimitOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'true = LONG (buy), false = SHORT (sell)', example: true })
  @IsBoolean()
  isBuy: boolean;

  @ApiProperty({ description: 'Limit price', example: '65000.50' })
  @IsString()
  price: string;

  @ApiProperty({ description: 'Position size', example: '0.5' })
  @IsString()
  size: string;

  @ApiPropertyOptional({ description: 'true = Add Liquidity Only (ALO)', example: false })
  @IsOptional()
  @IsBoolean()
  postOnly?: boolean;
}

export class OpenMarketOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'true = LONG (buy), false = SHORT (sell)', example: true })
  @IsBoolean()
  isBuy: boolean;

  @ApiProperty({ description: 'Position size', example: '0.5' })
  @IsString()
  size: string;
}

// ==================== CLOSE POSITION ORDERS ====================

export class CloseLimitOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Limit price', example: '65000.50' })
  @IsString()
  price: string;

  @ApiProperty({ description: 'Position size to close', example: '0.5' })
  @IsString()
  size: string;

  @ApiPropertyOptional({ description: 'true = Add Liquidity Only (ALO)', example: false })
  @IsOptional()
  @IsBoolean()
  postOnly?: boolean;
}

export class CloseMarketOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Position size to close', example: '0.5' })
  @IsString()
  size: string;
}

// ==================== TP/SL ORDERS ====================

export class TakeProfitOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Current position direction: true = LONG, false = SHORT', example: true })
  @IsBoolean()
  isBuy: boolean;

  @ApiProperty({ description: 'Position size to close', example: '0.5' })
  @IsString()
  size: string;

  @ApiProperty({ description: 'Take profit execution price', example: '70000.00' })
  @IsString()
  takeProfitPrice: string;

  @ApiProperty({ description: 'Take profit trigger price', example: '70000.00' })
  @IsString()
  takeProfitTrigger: string;
}

export class StopLossOrderDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Current position direction: true = LONG, false = SHORT', example: true })
  @IsBoolean()
  isBuy: boolean;

  @ApiProperty({ description: 'Position size to close', example: '0.5' })
  @IsString()
  size: string;

  @ApiProperty({ description: 'Stop loss execution price', example: '60000.00' })
  @IsString()
  stopLossPrice: string;

  @ApiProperty({ description: 'Stop loss trigger price', example: '60000.00' })
  @IsString()
  stopLossTrigger: string;
}

// ==================== TWAP ====================

export class TwapDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'true = LONG (buy), false = SHORT (sell)', example: true })
  @IsBoolean()
  isBuy: boolean;

  @ApiProperty({ description: 'Total size to execute via TWAP', example: '5.0' })
  @IsString()
  size: string;

  @ApiProperty({ description: 'Duration in minutes (5-1440)', example: 10, minimum: 5, maximum: 1440 })
  @IsNumber()
  @Min(5)
  @Max(1440)
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Enable random order timing', default: true })
  @IsOptional()
  @IsBoolean()
  randomize?: boolean;
}

// ==================== CLOSE ALL POSITIONS ====================

export class CloseAllPositionsDto {
  @ApiProperty({ 
    description: 'Close method', 
    enum: CloseAllType,
    example: CloseAllType.MARKET_CLOSE 
  })
  @IsString()
  closeType: CloseAllType;
}

// ==================== ISOLATED MARGIN ====================

export class SetIsolatedModeDto {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC' })
  @IsString()
  coin: string;
}
