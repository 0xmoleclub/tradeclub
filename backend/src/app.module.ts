import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  appConfig,
  chainConfig,
  databaseConfig,
  jwtConfig,
  throttleConfig,
} from './config';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

// NEW: EVM/Hypercore modules
import { HypercoreWalletsModule } from './modules/hypercore-wallets/hypercore-wallets.module';
import { HypercoreModule } from './modules/hypercore/hypercore.module';

// Event Emitter
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsModule } from './events/events.module';

// Engines modules
import { MatchmakingModule } from './modules/matchmaking/matchmaking.module';
import { BattleModule } from './modules/battle/battle.module';

// DEPRECATED: Solana/Drift modules - commented out for EVM/Hypercore migration
// import { AgentWalletsModule } from './modules/drift-agent-wallets/drift-agent-wallets.module';
// import { DriftModule } from './modules/drift/drift.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, chainConfig, databaseConfig, jwtConfig, throttleConfig],
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

    // Event Emitter module
    EventEmitterModule.forRoot(),

    // Core modules
    DatabaseModule,
    SharedModule,

    // Websocket Events module
    EventsModule,

    // Engines modules
    // Battle / Match modules
    MatchmakingModule,
    BattleModule,

    // Feature modules
    AuthModule,
    UsersModule,
    HealthModule,

    // NEW: EVM/Hypercore modules
    HypercoreWalletsModule,
    HypercoreModule,

    // DEPRECATED: Solana/Drift modules - migrating to EVM/Hypercore
    // DriftAgentWalletsModule,
    // DriftModule,
  ],
})
export class AppModule {}
