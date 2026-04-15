# Indexer Reference

## Files

- `backend/src/modules/indexer/indexer.module.ts`
- `backend/src/modules/indexer/processor/prediction-indexer.processor.ts`
- `backend/src/modules/indexer/services/chain-indexer.service.ts`
- `backend/src/modules/indexer/services/hypersync.service.ts`

## Architecture

The worker (`worker.ts`) runs `IndexerModule`, which registers:
- `PredictionIndexerProcessor` — BullMQ consumer
- `ChainIndexerService` — fetches logs from Hypersync
- `HypersyncService` — low-level Hypersync client wrapper

## Queue

`INDEXER_QUEUE_PREDICTION_MARKET` polls chain on an interval, fetches `Trade` events, and updates DB.

## DB Updates on Trade

When a `Trade` event is indexed:
1. Upsert `BattlePredictionTrade` (mapped table name `BattlePredictionOrder`):
   - `txHash`, `blockNumber`, `marketAddress`, `type` (BUY/SELL), `shares`, `priceUsd`, `costUsd`, `userAddress`
2. Update `BattlePredictionChoice` for the traded outcome:
   - Increment `shares` (buys add, sells subtract)
   - Increment `volume` by `costUsd`
   - Recalculate `price` from LMSR spot price or use event cost/shares
3. Update `BattlePredictionQuestion` aggregates:
   - Increment `shares`, `volume`, `size`

## Event Signature

```solidity
event Trade(
  address indexed trader,
  uint8 indexed outcome,
  uint256 sharesDelta,
  uint256 cost,
  uint256 fee
);
```

Topic0 for filtering is computed from the event signature hash.
