import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class NonceQueryDto {
  @ApiProperty({
    type: String,
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value }) => value?.toLowerCase())
  walletAddress: string;
}
