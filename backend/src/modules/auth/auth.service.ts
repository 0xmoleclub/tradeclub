import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifyMessage, isAddress } from 'viem';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  /**
   * Check if address is EVM format (0x...)
   */
  private isEvmAddress(address: string): boolean {
    return isAddress(address, { strict: false });
  }

  /**
   * Check if address is Solana format (base58, 32-44 chars)
   */
  private isSolanaAddress(address: string): boolean {
    try {
      // Solana addresses are base58 encoded and 32 bytes
      const decoded = bs58.decode(address);
      return decoded.length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Detect wallet type from address
   */
  detectWalletType(address: string): 'evm' | 'solana' | 'unknown' {
    if (this.isEvmAddress(address)) return 'evm';
    if (this.isSolanaAddress(address)) return 'solana';
    return 'unknown';
  }

  /**
   * Prepare the message that user needs to sign
   * Same format for both EVM and Solana
   */
  prepareSigningMessage(nonce: string): string {
    return `Sign this message to verify your wallet. Nonce: ${nonce}`;
  }

  /**
   * Generate JWT token from payload
   */
  async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  /**
   * Verify EVM signature using EIP-191 (personal_sign)
   */
  private async verifyEvmSignature(
    message: string,
    signature: string,
    address: string,
  ): Promise<boolean> {
    try {
      const isValid = await verifyMessage({
        message,
        signature: signature as `0x${string}`,
        address: address as `0x${string}`,
      });
      return isValid;
    } catch (error) {
      this.logger.error('EVM signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify Solana signature using Ed25519
   */
  private verifySolanaSignature(
    message: string,
    signatureBase58: string,
    publicKeyBase58: string,
  ): boolean {
    try {
      // Validate public key format
      const publicKey = new PublicKey(publicKeyBase58);
      
      // Decode signature from base58
      const signature = bs58.decode(signatureBase58);
      
      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(message);
      
      // Verify using Ed25519
      return nacl.sign.detached.verify(
        messageBytes,
        signature,
        publicKey.toBytes(),
      );
    } catch (error) {
      this.logger.error('Solana signature verification error:', error);
      return false;
    }
  }

  /**
   * Login with signature verification (supports both EVM and Solana)
   */
  async login(data: LoginDto) {
    const { walletAddress, signature } = data;

    // Detect wallet type
    const walletType = this.detectWalletType(walletAddress);
    
    if (walletType === 'unknown') {
      throw new UnauthorizedException('Invalid wallet address format');
    }

    this.logger.log(`Login attempt with ${walletType} wallet: ${walletAddress}`);

    // Find user by appropriate address field
    let user;
    if (walletType === 'evm') {
      user = await this.usersService.findByEvmAddress(walletAddress);
    } else {
      // DEPRECATED: Solana support
      user = await this.usersService.findByWalletAddress(walletAddress);
    }

    if (!user || !user.nonce) {
      throw new UnauthorizedException('User not found or nonce expired');
    }

    const message = this.prepareSigningMessage(user.nonce);
    let isValid: boolean;

    if (walletType === 'evm') {
      // EVM signature verification
      isValid = await this.verifyEvmSignature(message, signature, walletAddress);
    } else {
      // Solana signature verification (DEPRECATED)
      isValid = this.verifySolanaSignature(message, signature, walletAddress);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Clear nonce and update last login
    const updatedUser = await this.usersService.loginSuccess(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: walletType === 'evm' ? user.evmAddress! : user.walletAddress!,
      walletType,
    };

    return {
      accessToken: await this.generateToken(payload),
      user: updatedUser,
      walletType,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
