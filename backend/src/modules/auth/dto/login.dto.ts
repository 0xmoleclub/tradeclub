import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'EVM wallet address (0x...)',
    example: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8B9',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Signature of the message (hex with 0x prefix)',
    example: '0x1234567890abcdef...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
