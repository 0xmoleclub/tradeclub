import { Module } from '@nestjs/common';
import { BattleService } from './battle.service';
import { EventsGateway } from '@/events/events.gateway';
import { BattleRepository } from './battle.repository';

@Module({
  providers: [BattleRepository, BattleService, EventsGateway],
})
export class BattleModule {}
