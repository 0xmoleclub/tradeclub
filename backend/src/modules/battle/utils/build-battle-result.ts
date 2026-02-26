import { MetricType } from '@prisma/client';
import { CreateBattleResultDto } from '../dto/battle-result.dto';

export function buildBattleResult(): CreateBattleResultDto {
  return {
    description: 'Player 1 wins by faster execution time',
    dataHash: 'abc123def456',
    isCorrect: true,
    codeCommitHash: 'commit789xyz',
    metrics: [
      {
        metric: MetricType.WIN_RATE,
        playerSlot: 1,
        value: 75, // percentage
      },
      {
        metric: MetricType.PNL,
        playerSlot: 2,
        value: -500, // negative PNL for player 2
      },
    ],
    outcome: 1, // Player 1 wins
    questionId: 'question123',
  };
}
