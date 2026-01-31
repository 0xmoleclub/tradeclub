import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsOptional, IsBoolean, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    description: 'Market index for collateral (0 for USDC spot market)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    description: 'Amount to deposit (in token units, including decimals)',
    example: '1000000000', // 1000 USDC with 6 decimals
  })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({
    description: 'Reduce only - only reduce position, no new deposit',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reduceOnly?: boolean;
}
