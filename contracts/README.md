# TradeClub Prediction Market (EVM)

This folder contains the EVM prediction market system for TradeClub. The design is **chain‑agnostic** and focuses on:

- **LMSR AMM** for pricing and trading.
- **Synthetic orderbook** computed offchain for UI depth.
- **Optimistic oracle** for outcome resolution (no admin).
- **Per‑match markets** deployed as **cheap proxy clones** (EIP‑1167).

## Architecture (high‑level)

### Contracts

1. **MarketFactory (upgradeable)**
   - Deploys a new market per match using EIP‑1167 clones.
   - Stores the current implementation address used for new markets.
   - Emits `MarketCreated(matchId, market, outcomes, b, feeBps, feeCollector)`.

2. **PredictionMarket (implementation, immutable)**
   - LMSR AMM trading and accounting.
   - Holds USDC collateral for the market.
   - Mints/burns outcome shares.
   - Handles trading fees and routes them to `feeCollector`.
   - Reads outcome from `MatchSettlement` before allowing redemption.

3. **MatchSettlement (upgradeable)**
   - Records match outcomes using **optimistic oracle** flow.
   - No admin; anyone can propose outcome + bond; anyone can dispute within window.
   - Finalized outcome becomes authoritative for market redemption.

### Key Decisions

- **One market per match.** Each match gets its own clone.
- **No per‑market upgrades.** New markets use the latest implementation only.
- **Collateral = USDC.** Users pay USDC to buy shares; contract holds USDC until settlement.
- **Fees go to `feeCollector`.** Backend is market creator.
- **LMSR pricing.** Liquidity parameter `b` defines market depth.
- **Synthetic orderbook.** Offchain indexer aggregates volume by ticks for UI.

## LMSR Basics (for devs)

- Cost function:
  $$C(\vec{q}) = b \cdot \ln\left(\sum_i e^{q_i/b}\right)$$
- Instantaneous price for outcome `i`:
  $$p_i = \frac{e^{q_i/b}}{\sum_j e^{q_j/b}}$$
- Trade cost:
  $$\text{cost} = C(\vec{q}_{after}) - C(\vec{q}_{before})$$

`q_i` is the outstanding shares for outcome `i`. `b` controls depth; bigger `b` means less slippage.

## Synthetic Orderbook (offchain)

- **Depth at tick** is computed by sampling the LMSR curve between price levels.
- **Volume per tick** requires indexing trades and aggregating by price bucket.
- The onchain contracts emit trade events used by the indexer.

## Tooling: Hardhat + Foundry Hybrid

- **Hardhat**: deployment scripts, ABI output for SDK.
- **Foundry**: unit tests and fuzzing.

### Local commands (when installed)

```bash
cd contracts
pnpm install
pnpm hardhat compile
forge build
```

## TODO: Parameterization

- Fee rate (bps).
- Default LMSR `b` per market.
- Outcome count (binary vs N‑way).
- Optimistic oracle dispute window and bond size.

## Repository layout

```
contracts/
  contracts/                # Solidity sources (shared by Hardhat & Foundry)
  hardhat.config.ts
  foundry.toml
  sdk/                       # Shared TS client SDK
  scripts/                   # Hardhat deployment scripts
  test/                      # Foundry tests (or Hardhat if needed)
```
