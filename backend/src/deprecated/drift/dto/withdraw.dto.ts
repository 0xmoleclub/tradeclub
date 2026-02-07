import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsOptional, IsBoolean, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({
    description: 'Market index for collateral (0 for USDC spot market)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  marketIndex: number;

  @ApiProperty({
    description: 'Amount to withdraw (in token units, including decimals)',
    example: '1000000000',
  })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({
    description: 'Reduce only - only reduce position',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reduceOnly?: boolean;
}
