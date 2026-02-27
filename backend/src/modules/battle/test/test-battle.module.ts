import { Module } from '@nestjs/common';
import { TestBattleController } from './test-battle.controller';
import { TestBattleService } from './test-battle.service';
import { BattleModule } from '../battle.module';

@Module({
  imports: [BattleModule],
  controllers: [TestBattleController],
  providers: [TestBattleService],
})
export class TestBattleModule {}
