import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsInt, Min } from 'class-validator';
import { PositionDirectionEnum } from '@/common/enums';

export class PlaceTpSlDto {
  @ApiProperty({
    description: 'Market index (e.g., 0 for SOL-PERP)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    enum: PositionDirectionEnum,
    description: 'Order direction (opposite of position)',
    example: PositionDirectionEnum.SHORT,
  })
  @IsEnum(PositionDirectionEnum)
  direction: PositionDirectionEnum;

  @ApiProperty({
    description: 'Base asset amount to close (in base token units)',
    example: '1000000000',
  })
  @IsNumberString()
  baseAssetAmount: string;

  @ApiProperty({
    description: 'Trigger price (stop loss or take profit price)',
    example: '140000000', // $140 trigger
  })
  @IsNumberString()
  triggerPrice: string;

  @ApiPropertyOptional({
    description: 'Execution price (limit price when triggered, omit for market execution)',
    example: '139500000',
  })
  @IsOptional()
  @IsNumberString()
  limitPrice?: string;
}
