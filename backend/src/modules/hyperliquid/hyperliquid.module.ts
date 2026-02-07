import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HyperliquidController } from './hyperliquid.controller';
import { HyperliquidService } from './services/hyperliquid.service';
import { HyperliquidWalletsModule } from '../hyperliquid-wallets/hyperliquid-wallets.module';

@Module({
  imports: [
    ConfigModule,
    HyperliquidWalletsModule,
  ],
  controllers: [HyperliquidController],
  providers: [HyperliquidService],
  exports: [HyperliquidService],
})
export class HyperliquidModule {}
