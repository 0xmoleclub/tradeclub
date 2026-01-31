import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UtilsService } from '../../shared/utils/utils.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IJwtPayload } from '../../common/interfaces';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private utilsService: UtilsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.utilsService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.usersService.findById(user.id);
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshExpiration'),
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshExpiration'),
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.usersService.findById(userId);
    
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
