# Prediction Market Contracts

## Files

- `contracts/contracts/PredictionMarket.sol` — LMSR AMM implementation
- `contracts/contracts/MarketFactory.sol` — EIP-1167 clone factory
- `contracts/contracts/MatchSettlement.sol` — optimistic oracle
- `contracts/sdk/src/index.ts` — TypeScript SDK/ABIs

## PredictionMarket.sol

### Key Storage
```solidity
bytes16 public matchId;
IERC20 public usdc;
IMatchSettlement public matchSettlement;
address public feeCollector;
uint16 public feeBps;
uint256 public bScore;      // WAD
uint8 public outcomesCount;
mapping(address => mapping(uint8 => uint256)) public shares;
mapping(uint8 => uint256) public totalShares;
```

### Events
```solidity
event Trade(address indexed trader, uint8 indexed outcome, uint256 sharesDelta, uint256 cost, uint256 fee);
event Redeemed(address indexed trader, uint8 indexed outcome, uint256 shares, uint256 payout);
```

### Math Functions
- `price(uint8 outcome)` — spot price in WAD
- `quoteBuy(uint8 outcome, uint256 amountShares)` → `(costUsdc, feeUsdc)`
- `quoteSell(uint8 outcome, uint256 amountShares)` → `(proceedsUsdc, feeUsdc)`
- `_tradeCostWad(...)` — core LMSR cost delta using PRBMath `UD60x18`

### WAD Conventions
- Shares are WAD (1e18).
- USDC is 6 decimals.
- Conversion: `WAD_TO_USDC = 1e12`.
- `_toUsdcDown()` truncates; `_toUsdcUp()` rounds up.

## MarketFactory.sol

- `createMarket(MarketConfig calldata config)` deploys an EIP-1167 clone of the current implementation.
- Emits `MarketCreated(matchId, market, outcomes, b, feeBps, feeCollector)`.
- `implementation` address can be updated for future markets.

## MatchSettlement.sol

- `proposeOutcome(bytes16 matchId, uint8 outcome, bytes32 dataHash)` — bond-based proposal
- `disputeOutcome(bytes16 matchId)` — challenge within dispute window
- `getOutcome(bytes16 matchId)` → `(bool finalized, uint8 outcome)`
- Used by `PredictionMarket.redeem()` to validate payouts.
