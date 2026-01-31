import { Module } from '@nestjs/common';
import { DriftController } from './drift.controller';
import { DriftService } from './services/drift.service';
import { AgentWalletsModule } from '../agent-wallets/agent-wallets.module';

@Module({
  imports: [AgentWalletsModule],
  controllers: [DriftController],
  providers: [DriftService],
  exports: [DriftService],
})
export class DriftModule {}
