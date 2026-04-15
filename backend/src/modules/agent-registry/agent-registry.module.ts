import { Module } from '@nestjs/common';
import { AgentRegistryController } from './controllers/agent-registry.controller';
import { AgentRegistryService } from './services/agent-registry.service';
import { HypercoreWalletsModule } from '../hypercore-wallets/hypercore-wallets.module';

@Module({
  imports: [HypercoreWalletsModule],
  controllers: [AgentRegistryController],
  providers: [AgentRegistryService],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
