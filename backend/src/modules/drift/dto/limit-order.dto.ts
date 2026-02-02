import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { PositionDirectionEnum } from '@/common/enums';

export class LimitOrderDto {
  @ApiProperty({
    description: 'Market index (e.g., 0 for SOL-PERP)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    enum: PositionDirectionEnum,
    description: 'Order direction',
    example: PositionDirectionEnum.LONG,
  })
  @IsEnum(PositionDirectionEnum)
  direction: PositionDirectionEnum;

  @ApiProperty({
    description: 'Base asset amount (in base token units)',
    example: '1000000000', // 1 SOL with 9 decimals
  })
  @IsNumberString()
  baseAssetAmount: string;

  @ApiProperty({
    description: 'Limit price (in quote token units with 6 decimals)',
    example: '150000000', // $150 with 6 decimals
  })
  @IsNumberString()
  price: string;

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
