---
name: tradeclub-backend-patterns
description: Build and maintain the TradeClub NestJS backend. Covers module conventions, Prisma schema patterns, BullMQ job processors, Hyperliquid agent wallets, battle lifecycle services, and REST API structure. Use when adding backend features, fixing bugs, or refactoring services in the NestJS monolith.
---

# TradeClub Backend Patterns

## Quick Overview

- **Framework**: NestJS 10 with a separate Worker process (`worker.ts`).
- **ORM**: Prisma 5 + PostgreSQL.
- **Queues**: BullMQ + Redis (`AppModule` = producer, `WorkerModule` = consumer).
- **Auth**: EIP-191 signature → JWT.
- **Trading**: Platform-managed EVM agent wallets trade Hyperliquid on users' behalf.

## When to Use

- Adding a new module, controller, or service
- Writing Prisma migrations for battle/prediction data
- Creating BullMQ jobs and processors
- Integrating Hyperliquid APIs or agent wallet logic
- Building battle lifecycle or matchmaking features

## Core References

- **Prisma Schema**: See [references/prisma.md](references/prisma.md)
- **BullMQ Patterns**: See [references/bullmq.md](references/bullmq.md)
- **Hyperliquid Integration**: See [references/hyperliquid.md](references/hyperliquid.md)
- **Battle Lifecycle**: See [references/battle.md](references/battle.md)

## Module Conventions

```
backend/src/modules/feature/
├── feature.module.ts
├── feature.controller.ts        # if REST API
├── services/
│   └── feature.service.ts
├── dto/
│   └── index.ts
├── types/
│   └── feature.type.ts
└── constants/
    └── feature.constants.ts
```

Register new modules in `backend/src/app.module.ts` (API) or `backend/src/worker.module.ts` (background jobs).

## Key Patterns

### Prisma Transactions
Use `Prisma.TransactionClient` param pattern for nested battle writes:
```ts
async myMethod(battleId: string, tx: Prisma.TransactionClient = this.prisma) {
  return tx.battle.update({ ... });
}
```

### Config Access
```ts
const chain = this.config.getOrThrow<ChainConfig>('chain');
```

### DTOs
Use `class-validator` + `class-transformer`. Re-export from `dto/index.ts`.

### Guards
- `JwtAuthGuard` on routes
- `@CurrentUser()` decorator extracts user from request
