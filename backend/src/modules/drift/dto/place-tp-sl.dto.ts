import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { PositionDirection } from '@drift-labs/sdk';
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

  @ApiProperty({
    description: 'Execution price (limit price when triggered, 0 for market)',
    example: '139500000',
    default: '0',
  })
  @IsOptional()
  @IsNumberString()
  limitPrice?: string;

  @ApiProperty({
    description: 'true = Stop Loss, false = Take Profit',
    example: true,
  })
  @IsBoolean()
  isStopLoss: boolean;
}
