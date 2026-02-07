import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
   * Check if address is valid EVM format (0x...)
   */
  private isEvmAddress(address: string): boolean {
    return isAddress(address, { strict: false });
  }

  /**
   * Prepare the message that user needs to sign
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
   * Login with EVM signature verification
   */
  async login(data: LoginDto) {
    const { walletAddress, signature } = data;

    // Validate EVM address
    if (!this.isEvmAddress(walletAddress)) {
      throw new UnauthorizedException('Invalid EVM wallet address format');
    }

    this.logger.log(`Login attempt: ${walletAddress}`);

    // Find user by EVM address
    const user = await this.usersService.findByEvmAddress(walletAddress);

    if (!user || !user.nonce) {
      throw new UnauthorizedException('User not found or nonce expired');
    }

    const message = this.prepareSigningMessage(user.nonce);
    const isValid = await this.verifyEvmSignature(message, signature, walletAddress);

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Clear nonce and update last login
    const updatedUser = await this.usersService.loginSuccess(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: user.evmAddress!,
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
