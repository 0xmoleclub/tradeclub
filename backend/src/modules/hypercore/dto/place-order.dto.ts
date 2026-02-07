import { IsString, IsEnum, IsOptional, IsBoolean, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSide, OrderType, TimeInForce } from '../types/hyperliquid.types';

export class PlaceOrderDto {
  @ApiProperty({ description: 'Asset symbol (e.g., BTC, ETH)', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ enum: ['LONG', 'SHORT'], description: 'Order side' })
  @IsEnum(['LONG', 'SHORT'] as const)
  side: OrderSide;

  @ApiProperty({ description: 'Order size', example: '0.1' })
  @IsNumberString()
  size: string;

  @ApiProperty({ enum: ['MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT'], description: 'Order type' })
  @IsEnum(['MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT'] as const)
  orderType: OrderType;

  @ApiPropertyOptional({ description: 'Limit price (required for LIMIT orders)', example: '65000' })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({ enum: ['Gtc', 'Ioc', 'Alo'], default: 'Gtc', description: 'Time in force' })
  @IsOptional()
  @IsEnum(['Gtc', 'Ioc', 'Alo'] as const)
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ description: 'Reduce only order', default: false })
  @IsOptional()
  @IsBoolean()
  reduceOnly?: boolean;

  @ApiPropertyOptional({ description: 'Trigger price for stop orders', example: '60000' })
  @IsOptional()
  @IsNumberString()
  triggerPrice?: string;
}
