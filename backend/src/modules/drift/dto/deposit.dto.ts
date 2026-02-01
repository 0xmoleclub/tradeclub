import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';

export enum PaymentMethod {
  USDC = 'USDC',
  SOL = 'SOL',
}

export class DepositDto {
  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method - USDC (direct) or SOL (auto-swapped to USDC)',
    example: PaymentMethod.USDC,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Amount to deposit in USD (minimum $5). If paying with SOL, this amount of USDC will be received after swap.',
    example: '5',
    minimum: 5,
  })
  @IsNumberString()
  @Min(5)
  amount: string;

  @ApiPropertyOptional({
    description: 'Reduce only - only reduce position, no new deposit',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reduceOnly?: boolean;
}
