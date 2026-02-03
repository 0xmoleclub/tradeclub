# Frontend Integration Guide

## Overview

This guide explains how to integrate the TradeClub trading platform with your frontend. Users maintain full control of their funds - the backend only holds an agent wallet key that is **useless without on-chain authorization**.

## Security Model

- **Agent Wallet**: Created/stored by backend, holds SOL for gas fees
- **User Wallet**: Holds all funds, must authorize agent wallet on-chain
- **Authorization**: User signs a transaction to set agent as "delegate" on Drift Protocol
- **Revocation**: User can revoke authorization anytime by setting delegate to null

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER WALLET                          │
│                   (Holds USDC in Drift)                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
     ┌──────────────┴──────────────┐
     │   Sets Delegate (On-Chain)  │
     │  via @solana/web3.js        │
     └──────────────┬──────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                     AGENT WALLET                            │
│              (Backend-held, needs delegation)               │
│                                                             │
│  Can ONLY trade if:                                         │
│  1. User set agent as delegate on Drift                     │
│  2. User has NOT revoked delegation                         │
└─────────────────────────────────────────────────────────────┘
```

## Available Markets

| Symbol | Name | Base Decimals |
|--------|------|---------------|
| SOL | SOL-PERP | 9 |
| BTC | BTC-PERP | 8 |
| ETH | ETH-PERP | 8 |
| JTO | JTO-PERP | 9 |
| JUP | JUP-PERP | 6 |
| WIF | WIF-PERP | 6 |
| BONK | BONK-PERP | 5 |
| HNT | HNT-PERP | 8 |
| PYTH | PYTH-PERP | 6 |
| W | W-PERP | 6 |
| TNSR | TNSR-PERP | 9 |
| DRIFT | DRIFT-PERP | 6 |

## API Endpoints

### 1. Authentication
```http
POST /api/v1/auth/nonce?walletAddress={walletAddress}
POST /api/v1/auth/login
```

**Request:**
```json
{
  "walletAddress": "9mECXZ2NZrHiWZJHppJp6tVQiqVBLFFh3XFW9qMib4HW",
  "signature": "base58_encoded_signature"
}
```

### 2. Agent Wallet
```http
POST /api/v1/agent-wallets           # Create
GET  /api/v1/agent-wallets/me        # Get info
GET  /api/v1/agent-wallets/gas-balance # Get SOL balance
```

### 3. Drift Account Setup
```http
GET  /api/v1/drift/account/delegation-tx       # Get unsigned delegate tx
GET  /api/v1/drift/account/revoke-delegation-tx # Get unsigned revoke tx
GET  /api/v1/drift/account/initialize-tx       # Get unsigned init tx
GET  /api/v1/drift/account/status              # Check status
```

### 4. Trading (requires delegation)
```http
POST /api/v1/drift/order/place/market    # Place market order
POST /api/v1/drift/order/place/limit     # Place limit order
POST /api/v1/drift/order/cancel          # Cancel order
POST /api/v1/drift/orders/cancel-all     # Cancel all
POST /api/v1/drift/position/close/market # Close position at market
POST /api/v1/drift/position/close/limit  # Close position at limit
POST /api/v1/drift/positions/close-all   # Close all positions
GET  /api/v1/drift/positions             # Get positions
GET  /api/v1/drift/orders                # Get open orders
POST /api/v1/drift/deposit               # Deposit
POST /api/v1/drift/withdraw              # Withdraw
```

## Frontend Implementation

### Setup
```bash
npm install @solana/web3.js @solana/wallet-adapter-react bs58
```

### Sign and Submit Delegation (Direct to Solana)

```typescript
import { Connection, Transaction } from '@solana/web3.js';

const API_URL = 'https://api.tradeclub.io/api/v1';

// Get unsigned transaction from backend
async function getDelegationTx(token: string) {
  const res = await fetch(`${API_URL}/drift/account/delegation-tx`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.transaction; // base64 encoded
}

// Sign and submit DIRECTLY to Solana (not to backend!)
async function delegateAgentWallet(
  transactionBase64: string,
  wallet: any, // from useWallet()
  connection: Connection
) {
  // Deserialize
  const txBuffer = Buffer.from(transactionBase64, 'base64');
  const transaction = Transaction.from(txBuffer);
  
  // Sign with user's wallet
  const signedTx = await wallet.signTransaction(transaction);
  
  // Submit to Solana directly
  const signature = await connection.sendRawTransaction(
    signedTx.serialize(),
    { skipPreflight: false, preflightCommitment: 'confirmed' }
  );
  
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

// Complete flow
async function authorizeAgent(wallet, connection) {
  const token = localStorage.getItem('accessToken');
  const unsignedTx = await getDelegationTx(token);
  const signature = await delegateAgentWallet(unsignedTx, wallet, connection);
  console.log('Delegated! Signature:', signature);
}
```

## Trading Examples

### Place Market Order

Executes immediately at the best available price. If market order fails due to slippage (volatile market), automatically falls back to a limit order at market price + 0.5% buffer.

```bash
curl -X POST http://localhost:3002/api/v1/drift/order/place/market \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SOL",
    "direction": "long",
    "amount": "1.5"
  }'
```

**Response (Market):**
```json
{
  "success": true,
  "signature": "5iV...",
  "orderType": "MARKET",
  "fallback": false,
  "symbol": "SOL",
  "amount": "1.5"
}
```

**Response (Limit Fallback - volatile market):**
```json
{
  "success": true,
  "signature": "5iV...",
  "orderType": "MARKET_FALLBACK",
  "fallback": true,
  "symbol": "SOL",
  "amount": "1.5"
}
```

### Place Limit Order

Executes at the specified price or better.

```bash
curl -X POST http://localhost:3002/api/v1/drift/order/place/limit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SOL",
    "direction": "long",
    "amount": "1.5",
    "price": "150.50"
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "orderType": "LIMIT",
  "symbol": "SOL",
  "amount": "1.5",
  "price": "150.50"
}
```

### Close Position at Market Price

Close a specific position immediately at the current market price. Automatically determines the correct amount and direction. If market order fails due to slippage, falls back to limit order at market price + 0.5% buffer.

```bash
curl -X POST http://localhost:3002/api/v1/drift/position/close/market \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SOL"
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "symbol": "SOL",
  "type": "CLOSE_MARKET",
  "fallback": false
}
```

### Close Position at Limit Price

```bash
curl -X POST http://localhost:3002/api/v1/drift/position/close/limit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SOL",
    "price": "155.00"
  }'
```

### Close All Positions

```bash
curl -X POST http://localhost:3002/api/v1/drift/positions/close-all \
  -H "Authorization: Bearer <token>"
```

### Get Positions

```bash
curl http://localhost:3002/api/v1/drift/positions \
  -H "Authorization: Bearer <token>"
```

### Get Open Orders

```bash
curl http://localhost:3002/api/v1/drift/orders \
  -H "Authorization: Bearer <token>"
```

### Cancel Order

```bash
curl -X POST http://localhost:3002/api/v1/drift/order/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 12345}'
```

## Amount Format

The API now accepts **human-readable amounts** instead of base units:

| Asset | Example Amount | Base Units (internal) |
|-------|----------------|----------------------|
| SOL | `"1.5"` | `1500000000` (9 decimals) |
| BTC | `"0.5"` | `50000000` (8 decimals) |
| JUP | `"100"` | `100000000` (6 decimals) |
| BONK | `"1000000"` | `100000000000` (5 decimals) |

**Price format**: Always in USD (e.g., `"150.50"` for $150.50)

## Error Handling

Common errors when placing orders:

| Error | Meaning | Solution |
|-------|---------|----------|
| `INVALID_SYMBOL` | Unknown asset symbol | Check available symbols list |
| `NO_DRIFT_ACCOUNT` | User doesn't have a Drift account | Initialize first via `GET /drift/account/initialize-tx` |
| `NO_AGENT_WALLET` | No agent wallet created | Create via `POST /agent-wallets` |
| `NOT_DELEGATED` | Agent wallet not authorized | Delegate via `GET /drift/account/delegation-tx` |
| `INSUFFICIENT_FUNDS` | Not enough USDC for order | Deposit via `POST /drift/deposit` |

## User Flows

### New User (No Drift Account)
1. Login (get JWT)
2. Create agent wallet (`POST /agent-wallets`)
3. User sends SOL to agent wallet address (for gas)
4. Initialize Drift (user signs tx, submits to Solana)
5. Delegate (user signs tx, submits to Solana)
6. Deposit (user signs tx, submits to Solana)
7. Trade using symbols like `{"symbol": "SOL", "amount": "1.5"}`

### Existing Drift User
1. Login (get JWT)
2. Create agent wallet (`POST /agent-wallets`)
3. User sends SOL to agent wallet address (for gas)
4. Delegate only (user signs tx, submits to Solana)
5. Trade using symbols like `{"symbol": "SOL", "amount": "1.5"}`

## Key Points

- **Delegation/revocation**: Frontend signs and submits directly to Solana, NOT to backend
- **Backend only**: Returns unsigned transactions, handles trading after authorization
- **Security**: User has full control, can revoke anytime
- **Gas**: User must fund agent wallet with SOL for transaction fees
- **Symbols**: Case-insensitive (SOL, sol, Sol all work)
- **Amounts**: Human-readable (1.5 instead of 1500000000)

## Network Configuration

**Devnet (Testing):**
```typescript
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
```

**Mainnet (Production):**
```typescript
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
```
