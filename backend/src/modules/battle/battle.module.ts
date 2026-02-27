import { Module } from '@nestjs/common';
import { EventsGateway } from '@/modules/battle/gateway/battle.gateway';
import { BattleService } from './services/battle.service';
import { BattlePredictionController } from './controllers/battle-prediction.controller';
import { BattlePlayerService } from './services/battle-player.service';
import { BattleLifecycleService } from './services/battle-lifecylce.service';
import { PredictionMarketModule } from '@/modules/prediction-market/prediction-market.module';
import { BattleRealtimeService } from './services/battle-realtime.service';

@Module({
  imports: [PredictionMarketModule],
  providers: [
    BattleLifecycleService,
    BattleRealtimeService,
    BattlePlayerService,
    BattleService,
    EventsGateway,
  ],
  controllers: [BattlePredictionController],
  exports: [BattleService, BattleLifecycleService, BattlePlayerService],
})
export class BattleModule {}
