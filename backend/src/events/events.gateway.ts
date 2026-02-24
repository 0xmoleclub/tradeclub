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
import { MatchmakingService } from '@/modules/matchmaking/services/matchmaking.service';

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
    private readonly matchmaking: MatchmakingService,
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

  // ============= HELPER METHODS ==============

  getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  getBattleRoom(battleId: string) {
    return `battle:${battleId}`;
  }

  async addSocketToUserRoom(socket: Socket, userId: string) {
    socket.data.userId = userId;
    await socket.join(this.getUserRoom(userId));
  }

  // server helper to add all sockets of a list of users to battle room
  async addUsersToBattleRoom(battleId: string, userIds: string[]) {
    const room = this.getBattleRoom(battleId);
    for (const userId of userIds) {
      // use server.in(userRoom).socketsJoin(room) if supported
      try {
        this.server.in(this.getUserRoom(userId)).socketsJoin(room);
      } catch {
        // fallback: iterate sockets and join manually
        const sockets = Array.from(this.server.sockets.sockets.values());
        for (const s of sockets) {
          if (s.data?.userId === userId) {
            s.join(room);
          }
        }
      }
    }
    this.logger.log(`Added users ${userIds.join(', ')} to battle room ${room}`);
  }

  // ============= SUBSCRIBE METHODS ==============

  // client sends auth message after connecting to associate socket with userId
  @SubscribeMessage('auth')
  async onAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    const userId = payload?.userId;
    if (!userId) return;
    await this.addSocketToUserRoom(client, userId);
    this.logger.log(`Socket ${client.id} associated with user ${userId}`);
  }

  @SubscribeMessage(EVENTS.BATTLE_QUEUE)
  async joinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; elo: number; joinedAt: number },
  ) {
    this.matchmaking.addToQueue(payload);
    this.logger.log(`User ${payload.userId} joined matchmaking queue.`);
  }

  @SubscribeMessage(EVENTS.BATTLE_JOIN)
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
}
