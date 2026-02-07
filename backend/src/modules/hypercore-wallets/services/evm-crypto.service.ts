import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Service for EVM cryptographic operations
 * Handles keypair generation and AES-256-GCM encryption
 */
@Injectable()
export class EvmCryptoService {
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('WALLET_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('WALLET_ENCRYPTION_KEY is required for wallet encryption');
    }
    // Derive 32-byte key from the provided key using scrypt
    this.encryptionKey = scryptSync(key, 'salt', 32);
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
  encryptPrivateKey(privateKey: string): string {
    // Generate random IV (16 bytes for AES-GCM)
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    // Encrypt the private key (remove 0x prefix for storage efficiency)
    const keyToEncrypt = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
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
  decryptPrivateKey(encryptedData: string): `0x${string}` {
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivBase64, authTagBase64, encrypted] = parts;
    
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Add 0x prefix back
    return `0x${decrypted}` as `0x${string}`;
  }
}
