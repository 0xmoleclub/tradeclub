import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class NonceQueryDto {
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
}
