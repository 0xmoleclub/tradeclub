import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HypercoreController } from './hypercore.controller';
import { HypercoreService } from './services/hypercore.service';
import { HypercoreWalletsModule } from '../hypercore-wallets/hypercore-wallets.module';

@Module({
  imports: [
    ConfigModule,
    HypercoreWalletsModule,
  ],
  controllers: [HypercoreController],
  providers: [HypercoreService],
  exports: [HypercoreService],
})
export class HypercoreModule {}
