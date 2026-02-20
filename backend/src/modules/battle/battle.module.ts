import { Module } from '@nestjs/common';
import { EventsGateway } from '@/events/events.gateway';
import { BattleService } from './services/battle.service';
import { BattlePlayerController } from './controllers/battle-player.controller';
import { BattlePlayerService } from './services/battle-player.service';
import { BattleEvents } from './events/battle.event';
import { BattlePlayerEvents } from './events/battle-player.event';
import { BattleLifecycleService } from './services/battle-lifecylce.service';
import { PredictionMarketModule } from '@/modules/prediction-market/prediction-market.module';

@Module({
  imports: [PredictionMarketModule],
  providers: [
    BattlePlayerService,
    BattleService,
    BattleLifecycleService,
    BattleEvents,
    BattlePlayerEvents,
    EventsGateway,
  ],
  controllers: [BattlePlayerController],
})
export class BattleModule {}
