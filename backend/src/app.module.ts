import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { appConfig, databaseConfig, jwtConfig, throttleConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AgentWalletsModule } from './modules/agent-wallets/agent-wallets.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, throttleConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
      }),
    }),

    // Core modules
    DatabaseModule,
    SharedModule,

    // Feature modules
    AuthModule,
    UsersModule,
    HealthModule,
    AgentWalletsModule,
  ],
})
export class AppModule {}
