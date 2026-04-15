# Hyperliquid Integration Patterns

## Files

- `backend/src/modules/hypercore-wallets/services/hypercore-wallets.service.ts`
- `backend/src/modules/hypercore-wallets/services/evm-crypto.service.ts`
- `backend/src/modules/hypercore/services/hypercore.service.ts`
- `backend/src/modules/hypercore/dto/place-order.dto.ts`

## Agent Wallet Flow

1. User logs in with EVM wallet.
2. `POST /api/v1/hypercore/agent` → backend generates new EVM keypair.
3. Private key is encrypted with AES-256-GCM (`evm-crypto.service.ts`).
4. `agentAddress` is returned to user.
5. User calls Hyperliquid's `ApproveAgent` onchain with `agentAddress`.
6. Backend can now trade on behalf of user using the decrypted agent key.

## HypercoreService

Wraps `@nktkas/hyperliquid` SDK. Key methods:
- `getAccountSummary(walletAddress)`
- `getOpenPositions(walletAddress)`
- `getOpenOrders(walletAddress)`
- `placeOrder(agentKey, orderRequest)`
- `cancelOrder(agentKey, coin, oid)`
- `updateLeverage(agentKey, coin, leverage, isCross)`

## DTO Pattern

```ts
export class PlaceMarketOrderDto {
  @IsString()
  coin!: string;

  @IsBoolean()
  isBuy!: boolean;

  @IsString()
  size!: string;
}
```

## Security

- `WALLET_ENCRYPTION_KEY` env var required.
- Agent keys never leave the backend unencrypted.
- All trading endpoints are JWT-protected.
