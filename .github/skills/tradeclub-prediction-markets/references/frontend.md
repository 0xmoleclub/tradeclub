# Frontend Prediction Market Integration

## Files

- `frontend/src/hooks/useBuyShares.ts` — full buy flow (approve + buy)
- `frontend/src/hooks/useQuoteBuy.ts` — read `quoteBuy` from contract
- `frontend/src/hooks/usePredictionMarkets.ts` — poll backend for market state
- `frontend/src/lib/api/prediction-market.ts` — API wrappers
- `frontend/src/lib/contracts/prediction-market.ts` — ABIs

## useBuyShares Pattern

1. Check USDC allowance via `publicClient.readContract`.
2. If allowance < maxCost, `writeContractAsync` ERC20 `approve` and wait for receipt.
3. `writeContractAsync` `PredictionMarket.buy(outcome, sharesWad, maxCostUsdc)`.
4. Track `status`: `idle` → `approving` → `buying` → `done` | `error`.

## ABIs

`PREDICTION_MARKET_ABI` must include:
- `buy`, `sell`, `redeem`
- `quoteBuy`, `quoteSell`
- `price`
- `totalShares`, `shares`

`ERC20_ABI` minimum: `approve`, `allowance`, `balanceOf`, `decimals`.

## API Endpoints (Backend)

- `GET /battle/:battleId/markets` → `BattleMarketsResponse`
- `GET /battle/:battleId/markets/:questionId/orderbook` → synthetic LMSR orderbook
- `GET /battle/:battleId/markets/:questionId/position?walletAddress=...` → user position
- `GET /battle/:battleId/markets/:questionId/chain-info` → `{ marketAddress, usdcAddress, chainId }`
