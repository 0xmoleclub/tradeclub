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
POST /api/v1/drift/account/initialize          # Get unsigned init tx
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

### Revoke Delegation

```typescript
async function revokeDelegation(wallet, connection) {
  const token = localStorage.getItem('accessToken');
  
  // Get unsigned revoke transaction
  const res = await fetch(`${API_URL}/drift/account/revoke-delegation-tx`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  // Sign and submit directly to Solana
  const txBuffer = Buffer.from(data.transaction, 'base64');
  const transaction = Transaction.from(txBuffer);
  const signedTx = await wallet.signTransaction(transaction);
  
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}
```

### Initialize Drift Account (New Users)

```typescript
async function initializeDriftAccount(wallet, connection) {
  const token = localStorage.getItem('accessToken');
  
  // Get unsigned init transaction
  const res = await fetch(`${API_URL}/drift/account/initialize`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  // Sign and submit directly to Solana
  const txBuffer = Buffer.from(data.transaction, 'base64');
  const transaction = Transaction.from(txBuffer);
  const signedTx = await wallet.signTransaction(transaction);
  
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}
```

## User Flows

### New User (No Drift Account)
1. Login (get JWT)
2. Create agent wallet (`POST /agent-wallets`)
3. User sends SOL to agent wallet address (for gas)
4. Initialize Drift (user signs tx, submits to Solana)
5. Delegate (user signs tx, submits to Solana)
6. Deposit (user signs tx, submits to Solana)
7. Trade!

### Existing Drift User
1. Login (get JWT)
2. Create agent wallet (`POST /agent-wallets`)
3. User sends SOL to agent wallet address (for gas)
4. Delegate only (user signs tx, submits to Solana)
5. Trade!

## Key Points

- **Delegation/revocation**: Frontend signs and submits directly to Solana, NOT to backend
- **Backend only**: Returns unsigned transactions, handles trading after authorization
- **Security**: User has full control, can revoke anytime
- **Gas**: User must fund agent wallet with SOL for transaction fees

## Network Configuration

**Devnet (Testing):**
```typescript
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
```

**Mainnet (Production):**
```typescript
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
```

## Full Example Component

See the complete React component in the full documentation or check the examples folder.

## Trading Examples

### Place Market Order

Executes immediately at the best available price.

```bash
curl -X POST http://localhost:3002/api/v1/drift/order/place/market \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketIndex": 0,
    "direction": "long",
    "baseAssetAmount": "1000000000"
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "orderType": "MARKET"
}
```

### Place Limit Order

Executes at the specified price or better.

```bash
curl -X POST http://localhost:3002/api/v1/drift/order/place/limit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketIndex": 0,
    "direction": "long",
    "baseAssetAmount": "1000000000",
    "price": "150000000"
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "orderType": "LIMIT"
}
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

- **baseAssetAmount**: In base token units with 9 decimals (e.g., `1000000000` = 1 SOL)
- **price**: In quote token units with 6 decimals (e.g., `150000000` = $150 USDC)

## Error Handling

Common errors when placing orders:

| Error | Meaning | Solution |
|-------|---------|----------|
| `NO_DRIFT_ACCOUNT` | User doesn't have a Drift account | Initialize first via `GET /drift/account/initialize-tx` |
| `NO_AGENT_WALLET` | No agent wallet created | Create via `POST /agent-wallets` |
| `NOT_DELEGATED` | Agent wallet not authorized | Delegate via `GET /drift/account/delegation-tx` |
| `INSUFFICIENT_FUNDS` | Not enough USDC for order | Deposit via `POST /drift/deposit` |


### Close Position at Market Price

Close a specific position immediately at the current market price. Automatically determines the correct amount and direction.

```bash
curl -X POST http://localhost:3002/api/v1/drift/position/close/market \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketIndex": 0
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "closedAmount": "1000000000",
  "marketIndex": 0,
  "type": "CLOSE_MARKET"
}
```

### Close Position at Limit Price

Close a specific position at a specified limit price.

```bash
curl -X POST http://localhost:3002/api/v1/drift/position/close/limit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketIndex": 0,
    "price": "155000000"
  }'
```

**Response:**
```json
{
  "success": true,
  "signature": "5iV...",
  "closedAmount": "1000000000",
  "marketIndex": 0,
  "limitPrice": "155000000",
  "type": "CLOSE_LIMIT"
}
```

### Close All Positions

Close all open positions at market price. Useful for emergency exits.

```bash
curl -X POST http://localhost:3002/api/v1/drift/positions/close-all \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "signatures": ["5iV...", "3xR..."],
  "closedPositions": [
    { "marketIndex": 0, "amount": "1000000000" },
    { "marketIndex": 1, "amount": "500000000" }
  ],
  "type": "CLOSE_ALL_MARKET"
}
```

**Note:** Close position endpoints automatically:
- Detect the position direction (long/short)
- Calculate the exact position size
- Use `reduceOnly: true` to prevent accidental position reversal

