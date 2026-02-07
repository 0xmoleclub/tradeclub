import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { WalletAddressValidator } from './login.dto';

export class NonceQueryDto {
  @ApiProperty({
    type: String,
    description: 'Wallet address to generate nonce for (EVM 0x... or Solana Base58). EVM is recommended for new users.',
    examples: {
      evm: {
        summary: 'EVM Address (recommended)',
        value: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8B9',
      },
      solana: {
        summary: 'Solana Address (deprecated)',
        value: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      },
    },
  })
  @IsNotEmpty()
  @IsString()
  @Validate(WalletAddressValidator)
  @Transform(({ value }) => value?.trim())
  walletAddress: string;
}
