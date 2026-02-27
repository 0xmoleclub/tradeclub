import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestBattleService } from './test-battle.service';
import { CreateTestBattleDto, FinishTestBattleDto } from './dto/test-battle.dto';

/**
 * DEV-ONLY controller for end-to-end testing of the battle/indexer pipeline.
 *
 * Endpoints:
 *  POST /test/battle            — seed mock players + create battle (triggers market creation queue)
 *  POST /test/battle/:id/start  — mark all players ready, advance MATCHING → RUNNING
 *  POST /test/battle/:id/finish — mark all players finished, advance RUNNING → FINISHED + propose on-chain outcome
 *  GET  /test/battle/:id        — fetch full battle state
 *
 * ⚠️  Not guarded by auth — do NOT expose in production.
 */
@ApiTags('Test – Battle')
@Controller('test/battle')
export class TestBattleController {
  constructor(private readonly testBattleService: TestBattleService) {}

  // ── Create ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a test battle with mock players',
    description:
      'Upserts N deterministic test users, forms a MatchGroup, calls BattleService.create() ' +
      'which enqueues on-chain prediction market deployment.',
  })
  create(@Body() dto: CreateTestBattleDto) {
    return this.testBattleService.createTestBattle(
      dto.playerCount,
      dto.matchId,
    );
  }

  // ── Start ─────────────────────────────────────────────────────────────────

  @Post(':battleId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start a test battle',
    description:
      'Marks all JOINED players as READY and triggers lifecycle evaluation ' +
      '(MATCHING → RUNNING).',
  })
  start(@Param('battleId') battleId: string) {
    return this.testBattleService.startTestBattle(battleId);
  }

  // ── Finish ────────────────────────────────────────────────────────────────

  @Post(':battleId/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finish a test battle',
    description:
      'Marks all PLAYING players as FINISHED, calls battleFinish() with mock metrics, ' +
      'and enqueues the on-chain outcome proposal.',
  })
  finish(
    @Param('battleId') battleId: string,
    @Body() dto: FinishTestBattleDto,
  ) {
    return this.testBattleService.finishTestBattle(battleId, dto.winnerOutcome);
  }

  // ── State ─────────────────────────────────────────────────────────────────

  @Get(':battleId')
  @ApiOperation({ summary: 'Get full battle state (players, questions, choices)' })
  getState(@Param('battleId') battleId: string) {
    return this.testBattleService.getBattleState(battleId);
  }
}
