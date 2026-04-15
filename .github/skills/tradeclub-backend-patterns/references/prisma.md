# Prisma Schema Patterns

## File

- `backend/prisma/schema.prisma`

## Core Models

### User
```prisma
model User {
  id         String   @id @default(uuid())
  evmAddress String?  @unique
  nonce      String?
  role       UserRole @default(USER)
  status     UserStatus @default(ACTIVE)
  elo        Int @default(1000)
  rankPoints Int @default(0)
  hypercoreWallet HypercoreWallet? @relation("HypercoreWallet")
  battlePlayers   BattlePlayer[]
}
```

### HypercoreWallet
```prisma
model HypercoreWallet {
  id        String @id @default(uuid())
  userId    String @unique
  agentAddress      String @unique
  encryptedAgentKey String
  masterAddress     String?
  encryptionVersion String @default("v1")
}
```

### Battle
```prisma
model Battle {
  id        String   @id @default(uuid())
  status    BattleStatus @default(WAITING)
  maxPlayers Int @default(4)
  intendedDurationMs Int @default(3600000)
  metadata  Json?
  players   BattlePlayer[]
  results   BattleResult[]
  battlePredictionQuestions BattlePredictionQuestion[]
}
```

### BattlePredictionQuestion
```prisma
model BattlePredictionQuestion {
  id        String @id @default(uuid())
  questionText String
  marketAddress String? @unique
  bScore Decimal @default("1000000000000000000") @db.Decimal(38, 18)
  shares Decimal @default(0) @db.Decimal(38, 18)
  volume Decimal @default(0) @db.Decimal(38, 18)
  size   Decimal @default(0) @db.Decimal(38, 18)
  choices BattlePredictionChoice[]
  trades  BattlePredictionTrade[]
}
```

### BattlePredictionChoice
```prisma
model BattlePredictionChoice {
  id        String @id @default(uuid())
  outcome   Int
  shares    Decimal @default(0) @db.Decimal(38, 18)
  volume    Decimal @default(0) @db.Decimal(38, 18)
  size      Decimal @default(0) @db.Decimal(38, 18)
  price     Decimal @default(0) @db.Decimal(38, 18)
  battleId  String
  battlePredictionQuestionId String
}
```

### BattlePredictionTrade
```prisma
model BattlePredictionTrade {
  id        String @id @default(uuid())
  txHash    String
  blockNumber Int
  marketAddress String
  type      PredictionTradeType // BUY | SELL
  shares    Decimal @default(0) @db.Decimal(38, 18)
  priceUsd  Decimal @default(0) @db.Decimal(38, 18)
  costUsd   Decimal @default(0) @db.Decimal(38, 18)
  userAddress String
  @@map("BattlePredictionOrder")
}
```

## Patterns

- Use `@db.Decimal(38, 18)` for all onchain WAD values.
- Use `Json?` for flexible battle metadata (matchId, avgElo, etc.).
- Unique constraints on `marketAddress` and `[battleId, slot]` for battle players.
