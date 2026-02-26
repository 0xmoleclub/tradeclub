# PHASE 1 - MATCHMAKING

```
Client → BATTLE_QUEUE
        ↓
Gateway → matchmaking.addToQueue
        ↓
MatchmakingEngine.tick()
        ↓
MATCH_FOUND (EventEmitter)
        ↓
BattleEvents.handleMatchFound
        ↓
BattleService.create()
        ↓
emit BATTLE_CREATED (socket)
```

# PHASE 2 - READY PHASE

```
Client → BATTLE_READY
        ↓
Gateway → emit PLAYER_READY
        ↓
BattlePlayerEvents.handleReady
        ↓
BattlePlayerService.markReady()
        ↓
BattleLifecycleService.evaluate()
        ↓
BattleService.battleStart()
        ↓
emit BATTLE_STARTED
```

# PHASE 3 - FINISH PHASE

```
Client → PLAYER_FINISHED
        ↓
BattlePlayerService.markFinished()
        ↓
BattleLifecycle.evaluate()
        ↓
BattleService.battleFinish()
        ↓
emit BATTLE_FINISHED
```

# PHASE 4 - PLAYER LEFT

```
Socket disconnect
        ↓
Gateway.emit PLAYER_LEFT
        ↓
BattlePlayerService.leaveBattle()
        ↓
BattleLifecycle.evaluate()
        ↓
battleCancel()
        ↓
emit BATTLE_CANCELLED
```

# Architectural and Relationship

## Services relation in system

```
Gateway
   ↓
EventEmitter
   ↓
BattlePlayerEvents
   ↓
BattlePlayerService
   ↓
BattleLifecycleService
   ↓
BattleService
```

## Expected Architecture

```
                   ┌──────────────┐
                   │  Gateway     │
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ EventEmitter │
                   └──────┬───────┘
                          ↓
                ┌────────────────────┐
                │ BattleLifecycle    │
                │   (STATE MACHINE)  │
                └─────────┬──────────┘
                          ↓
        ┌───────────────────────────────┐
        │ BattleService + PlayerService │
        └───────────────────────────────┘
```

## Clean Architecture

```
Gateway (transport only)
        ↓
EventEmitter (message bus)
        ↓
BattleLifecycleService  ← HEART (state machine)
        ↓
BattleDomainServices (BattleService, BattlePlayerService)
        ↓
BattleRealtimeService (socket broadcasting only)
```
