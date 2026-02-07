import {
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { NonceQueryDto } from './dto/nonce-query.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Payload } from './auth.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ 
    summary: 'Login with EVM wallet signature',
    description: `
Authenticate using EVM wallet signature.

**Steps:**
1. Call GET /auth/nonce?walletAddress=0x... to get nonce
2. Sign message: "Sign this message to verify your wallet. Nonce: {nonce}"
3. Send signature (hex with 0x prefix) to this endpoint
    `,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            evmAddress: { type: 'string', example: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8B9' },
            role: { type: 'string', example: 'USER' },
            status: { type: 'string', example: 'ACTIVE' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or user not found' })
  @ApiResponse({ status: 400, description: 'Invalid wallet address format' })
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Public()
  @Get('nonce')
  @ApiOperation({ 
    summary: 'Get nonce for signing',
    description: `
Get a nonce to sign for EVM wallet authentication.

Pass EVM address (0x...) as query parameter.
The nonce is valid for one login attempt and expires after use.
    `,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns nonce and message to sign',
    schema: {
      type: 'object',
      properties: {
        nonce: { type: 'string', example: '123456', description: '6-digit random nonce' },
        message: { type: 'string', example: 'Sign this message to verify your wallet. Nonce: 123456' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid wallet address format' })
  async getNonce(@Query() query: NonceQueryDto) {
    const nonce = await this.usersService.getNonce(query.walletAddress);
    const message = this.authService.prepareSigningMessage(nonce);

    return {
      nonce,
      message,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('check')
  @ApiOperation({ summary: 'Check token validity and return user info' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        walletAddress: { type: 'string' },
      },
    },
  })
  check(@CurrentUser() user: Payload): Payload {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Returns full user profile including Hyperliquid wallet info',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser() user: Payload) {
    return this.authService.getProfile(user.id);
  }
}
