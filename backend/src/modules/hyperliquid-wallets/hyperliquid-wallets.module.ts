import { Module } from '@nestjs/common';
import { HyperliquidWalletsService } from './services/hyperliquid-wallets.service';
import { HyperliquidWalletsController } from './controllers/hyperliquid-wallets.controller';
import { EvmCryptoService } from './services/evm-crypto.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [HyperliquidWalletsController],
  providers: [HyperliquidWalletsService, EvmCryptoService],
  exports: [HyperliquidWalletsService, EvmCryptoService],
})
export class HyperliquidWalletsModule {}
