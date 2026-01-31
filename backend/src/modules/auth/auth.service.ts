import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyMessage } from 'ethers';
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
   */
  prepareSigningMessage(nonce: string): string {
    return `Please sign this message to verify your address. Nonce: ${nonce}`;
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
   * Web3 Login with signature verification
   */
  async login(data: LoginDto) {
    const { walletAddress, signature } = data;

    const user = await this.usersService.findByWalletAddress(
      walletAddress.toLowerCase(),
    );

    if (!user || !user.nonce) {
      throw new UnauthorizedException('User not found or nonce expired');
    }

    try {
      const message = this.prepareSigningMessage(user.nonce);
      const recoveredAddress = verifyMessage(message, signature);
      const isValid =
        walletAddress.toLowerCase() === recoveredAddress.toLowerCase();

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
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
