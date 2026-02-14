import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EVENTS } from './events.constant';

@WebSocketGateway({
  cors: { origin: '*' },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const { userId, battleId } = client.data;

    this.logger.log(`Client disconnected: ${client.id}`);

    if (userId && battleId) {
      this.eventEmitter.emit(EVENTS.PLAYER_DISCONNECTED, { battleId, userId });
    }
  }

  @SubscribeMessage('battle.join')
  joinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string; userId: string },
  ) {
    const room = this.getBattleRoom(payload.battleId);

    client.join(room);
    client.data.userId = payload.userId;
    client.data.battleId = payload.battleId;

    this.logger.log(
      `Client ${client.id} joined battle room ${room} (userId: ${payload.userId})`,
    );
  }

  // ============== BROADCAST METHODS ==============

  broadcastToBattle(battleId: string, event: string, payload: any) {
    this.server.to(this.getBattleRoom(battleId)).emit(event, payload);
  }

  getBattleRoom(battleId: string) {
    return `battle:${battleId}`;
  }
}
