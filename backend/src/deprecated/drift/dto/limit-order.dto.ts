import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumberString, MinLength, MaxLength } from 'class-validator';
import { PositionDirectionEnum } from '@/common/enums';

export class LimitOrderDto {
  @ApiProperty({
    description: 'Asset symbol (e.g., SOL, BTC, ETH, JUP) - case insensitive',
    example: 'SOL',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  symbol: string;

  @ApiProperty({
    enum: PositionDirectionEnum,
    description: 'Order direction',
    example: PositionDirectionEnum.LONG,
  })
  @IsEnum(PositionDirectionEnum)
  direction: PositionDirectionEnum;

  @ApiProperty({
    description: 'Amount in base asset units (e.g., "1.5" for 1.5 SOL)',
    example: '1.5',
  })
  @IsNumberString()
  amount: string;

  @ApiProperty({
    description: 'Limit price in USD (e.g., "150.50" for $150.50)',
    example: '150.50',
  })
  @IsNumberString()
  price: string;
}
