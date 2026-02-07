import { Module } from '@nestjs/common';
import { HypercoreWalletsService } from './services/hypercore-wallets.service';
import { HypercoreWalletsController } from './controllers/hypercore-wallets.controller';
import { EvmCryptoService } from './services/evm-crypto.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [HypercoreWalletsController],
  providers: [HypercoreWalletsService, EvmCryptoService],
  exports: [HypercoreWalletsService, EvmCryptoService],
})
export class HypercoreWalletsModule {}
