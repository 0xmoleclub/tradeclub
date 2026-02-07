import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class WithdrawGasDto {
  @ApiProperty({
    description: 'Amount of SOL to withdraw (in SOL units, e.g., "0.05"). If not provided, withdraws all available balance minus rent exemption.',
    example: '0.05',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  amount?: string;
}
