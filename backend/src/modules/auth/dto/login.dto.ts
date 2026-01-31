import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: String,
    description: 'Solana wallet address (Base58)',
    example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'Invalid Solana wallet address format',
  })
  @Transform(({ value }) => value?.trim())
  walletAddress: string;

  @ApiProperty({
    type: String,
    description: 'Signature of the nonce message (Base58 encoded)',
    example: '5Hd...base58_signature',
  })
  @IsNotEmpty()
  @IsString()
  signature: string;
}
