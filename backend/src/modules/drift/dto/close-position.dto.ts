import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsNumberString } from 'class-validator';

export class ClosePositionMarketDto {
  @ApiProperty({
    description: 'Market index to close position for (e.g., 0 for SOL-PERP)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;
}

export class ClosePositionLimitDto {
  @ApiProperty({
    description: 'Market index to close position for (e.g., 0 for SOL-PERP)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    description: 'Limit price to close at (in quote token units with 6 decimals)',
    example: '150000000', // $150 with 6 decimals
  })
  @IsNumberString()
  price: string;
}
