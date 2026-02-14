import { MetricType } from '@prisma/client';

export class BattleMetricDto {
  metric: MetricType;
  playerSlot: number;
  value: number;
}

export class CreateBattleResultDto {
  name: string;
  dataHash: string;
  isCorrect: boolean;
  codeCommitHash: string;
  metrics: BattleMetricDto[];
}
