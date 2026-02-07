import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { appConfig, databaseConfig, jwtConfig, throttleConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

// NEW: EVM/Hyperliquid modules
import { HyperliquidWalletsModule } from './modules/hyperliquid-wallets/hyperliquid-wallets.module';
import { HyperliquidModule } from './modules/hyperliquid/hyperliquid.module';

// DEPRECATED: Solana/Drift modules - commented out for EVM/Hyperliquid migration
// import { AgentWalletsModule } from './modules/drift-agent-wallets/drift-agent-wallets.module';
// import { DriftModule } from './modules/drift/drift.module';

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
    
    // NEW: EVM/Hyperliquid modules
    HyperliquidWalletsModule,
    HyperliquidModule,
    
    // DEPRECATED: Solana/Drift modules - migrating to EVM/Hyperliquid
    // DriftAgentWalletsModule,
    // DriftModule,
  ],
})
export class AppModule {}
