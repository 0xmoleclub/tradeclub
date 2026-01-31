import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
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
   * Prepare the message that user needs to sign
   * Uses Solana's standard message format
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
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Login with Solana signature verification
   */
  async login(data: LoginDto) {
    const { walletAddress, signature } = data;

    const user = await this.usersService.findByWalletAddress(walletAddress);

    if (!user || !user.nonce) {
      throw new UnauthorizedException('User not found or nonce expired');
    }

    const message = this.prepareSigningMessage(user.nonce);
    const isValid = this.verifySolanaSignature(message, signature, walletAddress);

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Clear nonce and update last login
    const updatedUser = await this.usersService.loginSuccess(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
    };

    return {
      accessToken: await this.generateToken(payload),
      user: updatedUser,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
