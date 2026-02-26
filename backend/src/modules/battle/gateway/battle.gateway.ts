import { Injectable, Logger } from '@nestjs/common';
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
import { LoggerService } from '@/shared/logger/logger.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/battle',
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async handleConnection(client: Socket) {
    const { userId } = client.handshake.auth;
    if (!userId) return client.disconnect();

    client.data.userId = userId;
    client.join(this.getUserRoom(userId));

    this.logger.log(`Client connected: ${userId} (socket id: ${client.id})`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const battleId = client.data.battleId;

    if (!userId || !battleId) return;

    this.eventEmitter.emit(EVENTS.PLAYER_LEFT, { userId, battleId });
    this.logger.log(`Client disconnected: ${userId} (socket id: ${client.id})`);
  }

  @SubscribeMessage(EVENTS.BATTLE_QUEUE)
  async joinQueue(@ConnectedSocket() client: Socket) {
    this.eventEmitter.emit(EVENTS.PLAYER_QUEUE, {
      userId: client.data.userId,
    });
  }

  @SubscribeMessage(EVENTS.BATTLE_DEQUEUE)
  async leaveQueue(@ConnectedSocket() client: Socket) {
    this.eventEmitter.emit(EVENTS.PLAYER_DEQUEUE, {
      userId: client.data.userId,
    });
  }

  @SubscribeMessage(EVENTS.BATTLE_READY)
  async ready(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.eventEmitter.emit(EVENTS.PLAYER_READY, {
      battleId: data.battleId,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage(EVENTS.BATTLE_FINISHED)
  async finished(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.eventEmitter.emit(EVENTS.PLAYER_FINISHED, {
      battleId: data.battleId,
      userId: client.data.userId,
    });
  }

  getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  getBattleRoom(battleId: string) {
    return `battle:${battleId}`;
  }
}
