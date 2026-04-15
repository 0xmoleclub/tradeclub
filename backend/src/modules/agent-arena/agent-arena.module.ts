import { Module } from '@nestjs/common';
import { AgentArenaController } from './controllers/agent-arena.controller';
import { AgentArenaService } from './services/agent-arena.service';
import { HypercoreModule } from '../hypercore/hypercore.module';
import { PredictionMarketModule } from '../prediction-market/prediction-market.module';
import { BattleModule } from '../battle/battle.module';

@Module({
  imports: [HypercoreModule, PredictionMarketModule, BattleModule],
  controllers: [AgentArenaController],
  providers: [AgentArenaService],
})
export class AgentArenaModule {}
