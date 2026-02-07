import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isAddress } from 'viem';
import bs58 from 'bs58';

/**
 * Check if address is either EVM (0x...) or Solana (Base58)
 */
export function isValidWalletAddress(address: string): boolean {
  // Check EVM format
  if (isAddress(address, { strict: false })) {
    return true;
  }
  // Check Solana format (base58, 32 bytes)
  try {
    const decoded = bs58.decode(address);
    if (decoded.length === 32) return true;
  } catch {
    // Not valid base58
  }
  return false;
}

@ValidatorConstraint({ async: false })
export class WalletAddressValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidWalletAddress(value);
  }

  defaultMessage(): string {
    return 'Invalid wallet address format. Must be EVM (0x...) or Solana (Base58) address';
  }
}

export class LoginDto {
  @ApiProperty({
    type: String,
    description: 'Wallet address (EVM 0x... or Solana Base58). EVM is recommended for new users.',
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

  @ApiProperty({
    type: String,
    description: 'Signature of the nonce message. Format depends on wallet type: EVM (hex with 0x) or Solana (Base58)',
    examples: {
      evm: {
        summary: 'EVM Signature',
        value: '0x1a2b3c...hex_signature',
      },
      solana: {
        summary: 'Solana Signature',
        value: '5Hd...base58_signature',
      },
    },
  })
  @IsNotEmpty()
  @IsString()
  signature: string;
}
