import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@/events/events.constant';

@ApiTags('Battle Player')
@Controller('battle/:battleId/player')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BattlePlayerController {
  constructor(private readonly emitted: EventEmitter2) {}

  @Post(':userId/ready')
  ready(@Param('battleId') battleId: string, @Param('userId') userId: string) {
    this.emitted.emit(EVENTS.PLAYER_READY, { battleId, userId });
    return { success: true };
  }
}
