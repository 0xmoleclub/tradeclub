import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AgentAuthGuard } from './guards/agent-auth.guard';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';
import { AgentRegistryModule } from '../agent-registry/agent-registry.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: config.get('jwt.accessExpiration', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AgentRegistryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AgentAuthGuard, HybridAuthGuard],
  exports: [AuthService, AgentAuthGuard, HybridAuthGuard],
})
export class AuthModule {}
