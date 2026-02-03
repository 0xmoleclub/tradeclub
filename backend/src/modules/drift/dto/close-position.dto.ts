import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumberString, MinLength, MaxLength } from 'class-validator';

export class ClosePositionMarketDto {
  @ApiProperty({
    description: 'Asset symbol (e.g., SOL, BTC, ETH) - case insensitive',
    example: 'SOL',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  symbol: string;
}

export class ClosePositionLimitDto {
  @ApiProperty({
    description: 'Asset symbol (e.g., SOL, BTC, ETH) - case insensitive',
    example: 'SOL',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  symbol: string;

  @ApiProperty({
    description: 'Limit price in USD to close at (e.g., "150.50" for $150.50)',
    example: '150.50',
  })
  @IsNumberString()
  price: string;
}
