import { BattleMetricDto } from '../dto';

export function buildRanking(metrics: BattleMetricDto[]) {
  const roi = metrics.filter((m) => m.metric === 'ROI');

  return roi
    .sort((a, b) => b.value - a.value)
    .map((m, i) => ({
      slot: m.playerSlot,
      rank: i + 1,
    }));
}
