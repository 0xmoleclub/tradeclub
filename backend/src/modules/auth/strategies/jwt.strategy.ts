import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { IJwtPayload } from '../../../common/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: IJwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
