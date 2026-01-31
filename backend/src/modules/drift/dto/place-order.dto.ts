import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { PositionDirection, OrderType } from '@drift-labs/sdk';

export class PlaceOrderDto {
  @ApiProperty({
    description: 'Market index (e.g., 0 for SOL-PERP)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    enum: PositionDirection,
    description: 'Order direction',
    example: PositionDirection.LONG,
  })
  @IsEnum(PositionDirection)
  direction: PositionDirection;

  @ApiProperty({
    description: 'Base asset amount (in base token units)',
    example: '1000000000', // 1 SOL with 9 decimals
  })
  @IsNumberString()
  baseAssetAmount: string;

  @ApiProperty({
    enum: OrderType,
    description: 'Order type',
    example: OrderType.MARKET,
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiPropertyOptional({
    description: 'Limit price (required for limit orders)',
    example: '150000000', // $150 with 6 decimals
  })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({
    description: 'Trigger price (for stop loss / take profit orders)',
    example: '160000000',
  })
  @IsOptional()
  @IsNumberString()
  triggerPrice?: string;

  @ApiPropertyOptional({
    description: 'Reduce only - only close position, no new position',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reduceOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Post only - order must go on book, not take liquidity',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  postOnly?: boolean;
}
