import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { BattlePlayerStatus, MetricType, UserStatus } from '@prisma/client';
import { BattleService } from '../services/battle.service';
import { BattleLifecycleService } from '../services/battle-lifecylce.service';
import { MatchGroup } from '../../matchmaking/types/matchmaking.types';
import { CreateBattleResultDto } from '../dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TestBattleService {
  private readonly logger = new Logger(TestBattleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly battleService: BattleService,
    private readonly lifecycleService: BattleLifecycleService,
  ) {}

  /**
   * Seeds N mock users (upsert by evmAddress) and creates a battle via the
   * normal BattleService.create() path, which enqueues the on-chain market.
   */
  async createTestBattle(
    playerCount = 2,
    matchId?: string,
  ): Promise<{
    battleId: string;
    matchId: string;
    players: Array<{ userId: string; slot: number; evmAddress: string }>;
  }> {
    const resolvedMatchId = matchId ?? randomUUID();
    const playerCount_ = Math.max(2, Math.min(4, playerCount));

    // Upsert stable test users (deterministic by slot index)
    const users = await Promise.all(
      Array.from({ length: playerCount_ }, async (_, i: number) => {
        const evmAddress = `0x${'test000000000000000000000000000000000000'.slice(0, -i.toString().length)}${i + 1}`;
        return this.prisma.user.upsert({
          where: { evmAddress },
          create: {
            evmAddress,
            name: `Test Player ${i + 1}`,
            status: UserStatus.ACTIVE,
            elo: 1000,
          },
          update: {
            status: UserStatus.ACTIVE, // reset in case a previous test left them IN_BATTLE
          },
        });
      }),
    );

    const matchGroup: MatchGroup = {
      matchId: resolvedMatchId,
      avgElo: 1000,
      forced: true,
      createdAt: Date.now(),
      players: users.map((u: { id: string; elo: number }) => ({
        userId: u.id,
        elo: u.elo,
        joinedAt: Date.now(),
      })),
    };

    const battle = await this.battleService.create(matchGroup);
    this.logger.log(
      `[TEST] Created battle ${battle.id} (matchId=${resolvedMatchId}) with ${playerCount_} mock players`,
    );

    return {
      battleId: battle.id,
      matchId: resolvedMatchId,
      players: users.map(
        (u: { id: string; evmAddress: string | null }, i: number) => ({
          userId: u.id,
          slot: i + 1,
          evmAddress: u.evmAddress!,
        }),
      ),
    };
  }

  /**
   * Marks all JOINED players as READY and drives the lifecycle evaluation so
   * the battle transitions MATCHING → RUNNING.
   */
  async startTestBattle(battleId: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);

    // Mark every JOINED player as READY
    await this.prisma.battlePlayer.updateMany({
      where: { battleId, status: BattlePlayerStatus.JOINED },
      data: { status: BattlePlayerStatus.READY },
    });

    const result = await this.lifecycleService.evaluate(battleId);
    this.logger.log(
      `[TEST] Start evaluation for battle ${battleId}: ${JSON.stringify(result)}`,
    );
    return result;
  }

  /**
   * Marks all PLAYING players as FINISHED and drives the lifecycle evaluation
   * so the battle transitions RUNNING → FINISHED and proposes on-chain outcome.
   */
  async finishTestBattle(battleId: string, winnerOutcome = 0) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { players: true },
    });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);

    // Get the battle's prediction question
    const question = await this.prisma.battlePredictionQuestion.findFirst({
      where: { battleId },
    });

    // Mark all PLAYING players as FINISHED
    await this.prisma.battlePlayer.updateMany({
      where: { battleId, status: BattlePlayerStatus.PLAYING },
      data: { status: BattlePlayerStatus.FINISHED },
    });

    // Build a mock result DTO
    const dto: CreateBattleResultDto = {
      description: '[TEST] Mock battle result',
      dataHash: `test:${battleId}:${Date.now()}`,
      isCorrect: true,
      codeCommitHash: 'test-commit',
      outcome: winnerOutcome,
      questionId: question?.id ?? '',
      metrics: battle.players.map((p: { slot: number }, i: number) => ({
        metric: MetricType.PNL,
        playerSlot: p.slot,
        // Winning slot has highest PnL; others decrease by rank
        value: (battle.players.length - i) * 100,
      })),
    };

    const result = await this.battleService.battleFinish(battleId, dto);
    this.logger.log(
      `[TEST] Finished battle ${battleId} with winner outcome=${winnerOutcome}`,
    );
    return result;
  }

  /** Convenience: fetch full battle state including players. */
  async getBattleState(battleId: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        players: {
          include: {
            user: {
              select: { id: true, name: true, evmAddress: true, elo: true },
            },
          },
        },
        battlePredictionQuestions: { include: { choices: true } },
      },
    });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    return battle;
  }
}
