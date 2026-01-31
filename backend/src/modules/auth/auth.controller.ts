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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  @ApiOperation({ summary: 'Login with signature' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid signature or user not found' })
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Public()
  @Get('nonce')
  @ApiOperation({ summary: 'Get nonce for signing' })
  @ApiResponse({ status: 200, description: 'Returns nonce and message to sign' })
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
  @ApiResponse({ status: 200, description: 'Token is valid' })
  check(@CurrentUser() user: Payload): Payload {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
