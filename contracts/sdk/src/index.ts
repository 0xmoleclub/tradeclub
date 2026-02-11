export type MarketId = string;

export type OutcomePrice = {
  outcome: number;
  price: number;
};

export type TickDepth = {
  price: number;
  size: number;
};

export function lmsrPrice(q: number[], b: number, outcome: number): number {
  const denom = q.reduce((sum, qi) => sum + Math.exp(qi / b), 0);
  return Math.exp(q[outcome] / b) / denom;
}

export function lmsrCost(q: number[], b: number): number {
  const sum = q.reduce((acc, qi) => acc + Math.exp(qi / b), 0);
  return b * Math.log(sum);
}

export function lmsrTradeCost(qBefore: number[], qAfter: number[], b: number): number {
  return lmsrCost(qAfter, b) - lmsrCost(qBefore, b);
}

export function syntheticOrderbook(q: number[], b: number, outcome: number, ticks: number[]): TickDepth[] {
  const depths: TickDepth[] = [];
  for (let i = 0; i < ticks.length - 1; i += 1) {
    const priceStart = ticks[i];
    const priceEnd = ticks[i + 1];
    const size = Math.max(0, priceEnd - priceStart);
    depths.push({ price: priceEnd, size });
  }
  return depths;
}
