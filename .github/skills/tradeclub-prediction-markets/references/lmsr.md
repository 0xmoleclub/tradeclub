# LMSR Math Reference

## Formulas

- Cost function: `C(q) = b * ln(Σ exp(q_i / b))`
- Spot price: `p_i = exp(q_i / b) / Σ exp(q_j / b)`
- Trade cost: `cost = C(q_after) - C(q_before)`

## Backend Implementation

File: `backend/src/modules/prediction-market/services/prediction-market.service.ts`

### Spot Price
```ts
private lmsrSpotPrice(q: number[], b: number, i: number): number {
  const max = Math.max(...q.map((qi) => qi / b));
  const expQ = q.map((qi) => Math.exp(qi / b - max));
  const sumExp = expQ.reduce((a, x) => a + x, 0);
  return expQ[i] / sumExp;
}
```

### Cost
```ts
private lmsrCost(q: number[], b: number, i: number, delta: number): number {
  const qAfter = [...q];
  qAfter[i] += delta;
  return b * (this.lnSumExp(qAfter, b) - this.lnSumExp(q, b));
}
```

### Delta for Target Price (closed form)
```ts
private lmsrDeltaForTargetPrice(q: number[], b: number, i: number, targetPrice: number): number {
  const max = Math.max(...q.map((qi) => qi / b));
  const expQ = q.map((qi) => Math.exp(qi / b - max));
  const sumAll = expQ.reduce((a, x) => a + x, 0);
  const S = sumAll - expQ[i];
  const x = (S * targetPrice) / (1 - targetPrice);
  if (x <= 0) return 0;
  return b * (Math.log(x) + max) - q[i];
}
```

### Synthetic Orderbook Levels
```ts
private lmsrAskLevel(q, b, i, targetPrice) {
  const delta = this.lmsrDeltaForTargetPrice(q, b, i, targetPrice);
  if (delta <= 1e-12) return null;
  const costUsd = this.lmsrCost(q, b, i, delta);
  return { price: targetPrice, shares: delta, costUsd };
}

private lmsrBidLevel(q, b, i, targetPrice) {
  const delta = this.lmsrDeltaForTargetPrice(q, b, i, targetPrice); // negative
  if (delta >= -1e-12) return null;
  const proceedsUsd = -this.lmsrCost(q, b, i, delta);
  return { price: targetPrice, shares: Math.abs(delta), proceedsUsd };
}
```

## Normalization

- Database stores shares/volume/bScore as `Decimal @db.Decimal(38, 18)`.
- Backend normalizes: `Number(value) / 1e18` before math.
- Returns strings to frontend to avoid float serialization issues.
