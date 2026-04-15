# Battle Lifecycle Patterns

## Files

- `backend/src/modules/battle/services/battle.service.ts` — orchestrator
- `backend/src/modules/battle/services/battle-lifecylce.service.ts` — state machine
- `backend/src/modules/battle/services/battle-player.service.ts` — player actions
- `backend/src/modules/battle/services/battle-realtime.service.ts` — socket emits
- `backend/src/modules/battle/gateway/battle.gateway.ts` — Socket.IO gateway
- `backend/src/modules/battle/matchmaking/matchmaking.service.ts`
- `backend/src/modules/battle/matchmaking/matchmaking.engine.ts`

## Battle States

```ts
enum BattleStatus {
  WAITING
  READY
  STARTED
  FINISHED
  CANCELLED
}
```

## Lifecycle Flow

### Create
`BattleService.create(match: MatchGroup)`:
1. Validate users are `PENDING`.
2. Create `Battle` (status `WAITING`).
3. Create default `BattlePredictionQuestion` ("Who will win the battle?").
4. Create `BattlePredictionChoice` for each player slot (outcome 0..N-1).
5. Create `BattlePlayer` records with `slot` (1-based) and `eloSnapshot`.
6. Enqueue `CREATE_MARKET` job.

### Start
`BattleService.battleStart(battleId)`:
1. Verify status is `WAITING`.
2. Update status to `STARTED`, set `startedAt`.
3. Mark players as `PLAYING`.
4. Lock users (`status = IN_BATTLE`).

### Finish
`BattleService.battleFinish(battleId, dto)`:
1. Verify status is `STARTED`.
2. Update status to `FINISHED`, set `endedAt`.
3. `updateEloAndRankPoints()` — computes ranking from metrics, applies ELO delta.
4. Unlock users (`status = ACTIVE`).
5. `createBattleResult()` — persists deterministic outcome.
6. Enqueue `PROPOSE_OUTCOME` job for onchain oracle.

### Cancel
`BattleService.battleCancel(battleId)`:
- Only allowed from `WAITING`.
- Sets `CANCELLED`, unlocks users.

## ELO Logic

- `buildRanking(dto.metrics)` — sorts players by metric value.
- `computeEloDelta(rank, playerCount)` — returns delta based on position.
- Winner (rank 1) gains more; lower ranks gain less or lose.

## Socket Events

Gateway namespace: `/battle`
- `battle:queue` — join matchmaking
- `battle:dequeue` — leave matchmaking
- `battle:ready` — player ready
- `battle:finished` — player finished
- `player:left` — emitted on disconnect

Rooms:
- `user:${userId}` — per-user private room
- `battle:${battleId}` — battle broadcast room
