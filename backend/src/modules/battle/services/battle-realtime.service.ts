import { Injectable } from '@nestjs/common';
import { EventsGateway } from '../gateway/battle.gateway';

@Injectable()
export class BattleRealtimeService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToUser(userId: string, event: string, payload: any) {
    this.gateway.server
      .to(this.gateway.getUserRoom(userId))
      .emit(event, payload);
  }

  emitToBattle(battleId: string, event: string, payload: any) {
    this.gateway.server
      .to(this.gateway.getBattleRoom(battleId))
      .emit(event, payload);
  }

  async addUserToBattle(battleId: string, userId: string) {
    const sockets = await this.gateway.server
      .in(this.gateway.getUserRoom(userId))
      .fetchSockets();
    for (const socket of sockets) {
      socket.join(this.gateway.getBattleRoom(battleId));
      socket.data.battleId = battleId;
    }
  }

  async removeUserFromBattle(battleId: string, userId: string) {
    const sockets = await this.gateway.server
      .in(this.gateway.getUserRoom(userId))
      .fetchSockets();
    for (const socket of sockets) {
      socket.leave(this.gateway.getBattleRoom(battleId));
      delete socket.data.battleId;
    }
  }
}
