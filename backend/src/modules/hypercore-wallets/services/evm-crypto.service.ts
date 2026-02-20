import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createCipheriv, createDecipheriv, randomBytes, hkdf } from 'crypto';
import { promisify } from 'util';

const hkdfAsync = promisify(hkdf);

/**
 * Service for EVM cryptographic operations
 * Handles keypair generation and AES-256-GCM encryption
 */
@Injectable()
export class EvmCryptoService {
  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('WALLET_ENCRYPTION_KEY');
    if (!key) {
      throw new Error(
        'WALLET_ENCRYPTION_KEY is required for wallet encryption',
      );
    }
  }

  /**
   * Generate a new EVM keypair for Hyperliquid agent wallet
   * @returns Object with address and private key
   */
  generateKeypair(): { address: string; privateKey: `0x${string}` } {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    return {
      address: account.address,
      privateKey,
    };
  }

  /**
   * Encrypt private key using AES-256-GCM
   * @param privateKey - The private key to encrypt (hex string with 0x prefix)
   * @returns Encrypted data as base64 string (iv:authTag:ciphertext)
   */
  async encryptPrivateKey(privateKey: string): Promise<string> {
    // Generate random IV (16 bytes for AES-GCM)
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv(
      'aes-256-gcm',
      await this.getEncryptionKey(),
      iv,
    );

    // Encrypt the private key (remove 0x prefix for storage efficiency)
    const keyToEncrypt = privateKey.startsWith('0x')
      ? privateKey.slice(2)
      : privateKey;

    let encrypted = cipher.update(keyToEncrypt, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();

    // Combine: iv:authTag:ciphertext
    const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

    return result;
  }

  /**
   * Decrypt private key using AES-256-GCM
   * @param encryptedData - The encrypted data (iv:authTag:ciphertext)
   * @returns Decrypted private key with 0x prefix
   */
  async decryptPrivateKey(encryptedData: string): Promise<`0x${string}`> {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encrypted] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Create decipher
    const decipher = createDecipheriv(
      'aes-256-gcm',
      await this.getEncryptionKey(),
      iv,
    );
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Add 0x prefix back
    return `0x${decrypted}` as `0x${string}`;
  }

  // Derive 32-byte key from the provided key using hkdf 256 (fast derive algo)
  private async getEncryptionKey(): Promise<Buffer> {
    const encrypted: ArrayBuffer = await hkdfAsync(
      'sha256',
      this.configService.getOrThrow<string>('WALLET_ENCRYPTION_KEY'),
      this.configService.get<string>('WALLET_ENCRYPTION_KEY_SALT') || 'salt',
      'wallet-encryption-key:v1', // info (used to differentiate between derived keys)
      32,
    );
    return Buffer.from(encrypted);
  }
}
