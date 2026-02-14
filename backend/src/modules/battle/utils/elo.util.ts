export function computeEloDelta(rank: number, total: number) {
  if (rank === 1) return +25;
  if (rank === total) return -25;
  return 0;
}
