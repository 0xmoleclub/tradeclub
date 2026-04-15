---
name: tradeclub-prediction-markets
description: Build and maintain TradeClub's EVM prediction market system including LMSR AMM math, Solidity contracts (PredictionMarket, MarketFactory, MatchSettlement), event indexing, and frontend Web3 integration. Use when working on battle prediction markets, onchain market deployment, trade event ingestion, LMSR pricing, or synthetic orderbooks.
---

# TradeClub Prediction Markets

## Quick Overview

TradeClub runs per-match prediction markets as cheap EIP-1167 clones.
- **MarketFactory** deploys clones per battle.
- **PredictionMarket** holds LMSR AMM logic (`buy`, `sell`, `redeem`, `quoteBuy`, `quoteSell`).
- **MatchSettlement** optimistic oracle proposes/disputes outcomes.
- **Backend** enqueues market creation / outcome proposals via BullMQ, serves synthetic LMSR orderbooks, and indexes `Trade` events.
- **Frontend** signs USDC approvals and `buy()` directly via Wagmi.

## When to Use

- Adding new contract features (fees, new AMM mechanics, oracle changes)
- Fixing LMSR math mismatches between Solidity and backend
- Adding indexer support for new events
- Building frontend hooks for trading or redeeming
- Updating Prisma schema for prediction trades/questions

## Core References

- **Contracts**: See [references/contracts.md](references/contracts.md)
- **LMSR Math**: See [references/lmsr.md](references/lmsr.md)
- **Indexer**: See [references/indexer.md](references/indexer.md)
- **Frontend Integration**: See [references/frontend.md](references/frontend.md)

## Common Tasks

### Add a new event to the indexer
1. Add event definition to `contracts/contracts/PredictionMarket.sol`.
2. Add ABI fragment to `contracts/sdk/src/index.ts`.
3. Update `backend/src/modules/indexer/services/chain-indexer.service.ts` or `prediction-indexer.processor.ts` to parse the log.
4. Update Prisma models if persisting new data.

### Change LMSR b parameter logic
- Contract uses `UD60x18` from PRBMath: `bScore` is a WAD value.
- Backend normalizes with `Number(bScore) / 1e18`.
- Frontend receives raw string bScore from API.
- Always keep all three in sync.

### Deploy a new market implementation
- Update `PredictionMarket.sol`.
- Run `forge build` and `hardhat compile`.
- Update `MarketFactory` implementation pointer if factory is already deployed.
- Update `backend/src/config/chain.config.ts` with new contract addresses.
