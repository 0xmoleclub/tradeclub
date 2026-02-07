import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NonceQueryDto {
  @ApiProperty({
    description: 'EVM wallet address (0x...)',
    example: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8B9',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
