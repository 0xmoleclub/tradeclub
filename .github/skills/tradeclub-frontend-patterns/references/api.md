# API Layer Patterns

## Files

- `frontend/src/lib/api/prediction-market.ts`
- `frontend/src/hooks/usePredictionMarkets.ts`
- `frontend/src/services/trading.ts`

## REST API Wrapper Pattern

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchMarkets(battleId: string): Promise<BattleMarketsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/battle/${battleId}/markets`);
  if (!res.ok) throw new Error("Failed to fetch markets");
  return res.json();
}
```

## TanStack Query Hook Pattern

```ts
import { useQuery } from "@tanstack/react-query";

export function usePredictionMarkets(battleId?: string) {
  return useQuery<BattleMarketsResponse>({
    queryKey: ["prediction-markets", battleId],
    queryFn: () => fetchMarkets(battleId!),
    enabled: !!battleId,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
```

## Key API Endpoints

### Prediction Markets
- `GET /api/v1/battle/:battleId/markets`
- `GET /api/v1/battle/:battleId/markets/:questionId/orderbook`
- `GET /api/v1/battle/:battleId/markets/:questionId/position?walletAddress=...`
- `GET /api/v1/battle/:battleId/markets/:questionId/chain-info`

### Authentication
- `GET /api/v1/auth/nonce?walletAddress=...`
- `POST /api/v1/auth/login`

### Hyperliquid
- `POST /api/v1/hypercore/orders/market/open`
- `POST /api/v1/hypercore/orders/cancel`
- `GET /api/v1/hypercore/positions`

## Mutation Hooks

If adding POST mutations, wrap with `useMutation` and invalidate related queries with `queryClient.invalidateQueries` in `onSuccess`.
