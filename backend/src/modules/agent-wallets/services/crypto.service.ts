import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Service for encrypting/decrypting secret keys
 * Uses AES-256-GCM for authenticated encryption
 */
@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor(private configService: ConfigService) {}

  /**
   * Get encryption key from environment
   * Should be 32 bytes (256 bits)
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('WALLET_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }
    
    // Hash the key to ensure it's exactly 32 bytes
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt a secret key (64 bytes for Solana)
   * @param secretKey - The secret key Buffer to encrypt
   * @returns Encrypted data as base64 string with IV and auth tag
   */
  encryptSecretKey(secretKey: Buffer): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(secretKey),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    const result = Buffer.concat([
      iv,
      authTag,
      encrypted,
    ]).toString('base64');
    
    return result;
  }

  /**
   * Decrypt a secret key
   * @param encryptedData - The encrypted data from encryptSecretKey
   * @returns The decrypted secret key as Buffer (64 bytes)
   */
  decryptSecretKey(encryptedData: string): Buffer {
    const key = this.getEncryptionKey();
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, authTag, and encrypted content
    const iv = data.subarray(0, this.ivLength);
    const authTag = data.subarray(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = data.subarray(this.ivLength + this.authTagLength);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted;
  }
}
