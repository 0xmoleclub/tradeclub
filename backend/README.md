# TradeClub Backend API

A NestJS backend API for TradeClub with EVM wallet authentication and Hyperliquid trading.

## Features

- **EVM Wallet Authentication**: EIP-191 signature verification
  - Nonce-based signature verification
  - JWT token issuance after signature validation
  - Automatic user creation on first login
- **Agent Wallet**: Platform-managed EVM wallet for Hyperliquid trading
  - Backend generates EVM keypair per user
  - Encrypts private key with AES-256-GCM
  - User approves agent on Hyperliquid via `ApproveAgent` transaction
- **Hyperliquid Integration**: Full perpetual trading
  - Market/limit orders (open/close positions)
  - Take Profit / Stop Loss orders
  - Position and account management
  - Real-time market data
- **Prisma ORM**: PostgreSQL with type-safe queries
- **API Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, rate limiting, AES-256-GCM encryption

## Architecture

```
User EVM Wallet (funds here)
    ↓
  Approves agent on Hyperliquid
    ↓
Agent Wallet (platform-managed, trades on behalf)
    ↓
  Trades on
    ↓
Hyperliquid
```

## Database Schema (Prisma)

### User
| Field | Description |
|-------|-------------|
| `id` | UUID |
| `evmAddress` | User's EVM wallet address (unique) |
| `nonce` | Auth nonce |
| `role`, `status` | User management |
| `hypercoreWallet` | Optional 1:1 relation to agent wallet |

### HypercoreWallet
| Field | Description |
|-------|-------------|
| `id` | UUID |
| `userId` | FK to user |
| `agentAddress` | EVM address used as agent on Hyperliquid |
| `encryptedAgentKey` | AES-256-GCM encrypted private key |
| `encryptionVersion` | Encryption scheme version |

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Copy environment file
cp .env.example .env

# Update DATABASE_URL and WALLET_ENCRYPTION_KEY in .env
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Application port | `3002` |
| `JWT_SECRET` | JWT secret key | - |
| `WALLET_ENCRYPTION_KEY` | AES-256 encryption key | - |
| `HYPERLIQUID_NETWORK` | testnet or mainnet | `testnet` |
| `HYPERLIQUID_RPC_URL` | Hyperliquid RPC endpoint | `https://api.hyperliquid-testnet.xyz` |

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Swagger docs available at: `http://localhost:3002/docs`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/nonce?walletAddress=0x...` | Get nonce for signing |
| POST | `/api/v1/auth/login` | Login with signature |
| GET | `/api/v1/auth/check` | Validate JWT token |
| GET | `/api/v1/auth/me` | Get current user profile |

### Agent Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/hypercore/agent` | Create/replace agent wallet |
| GET | `/api/v1/hypercore/agent` | Get my agent wallet |

### Hypercore Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/hypercore/account` | Get account summary |
| GET | `/api/v1/hypercore/positions` | Get open positions |
| GET | `/api/v1/hypercore/positions/:coin` | Get position for coin |
| GET | `/api/v1/hypercore/orders/open` | Get open orders |
| POST | `/api/v1/hypercore/orders/market/open` | Open position with market order |
| POST | `/api/v1/hypercore/orders/limit/open` | Open position with limit order |
| POST | `/api/v1/hypercore/orders/market/close` | Close position with market order |
| POST | `/api/v1/hypercore/orders/limit/close` | Close position with limit order |
| POST | `/api/v1/hypercore/orders/take-profit` | Place take profit order |
| POST | `/api/v1/hypercore/orders/stop-loss` | Place stop loss order |
| POST | `/api/v1/hypercore/orders/cancel` | Cancel specific order |
| POST | `/api/v1/hypercore/orders/cancel-all` | Cancel all orders |
| POST | `/api/v1/hypercore/positions/close-all` | Close all positions |
| POST | `/api/v1/hypercore/leverage` | Update leverage |
| GET | `/api/v1/hypercore/markets` | Get available markets |
| GET | `/api/v1/hypercore/markets/:coin/price` | Get market price |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | Get all users |
| GET | `/api/v1/users/:id` | Get user by ID |
| PATCH | `/api/v1/users/:id` | Update user |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/health/liveness` | Liveness probe |

## Login Flow

```typescript
// 1. Get nonce
const { nonce, message } = await fetch(
  '/api/v1/auth/nonce?walletAddress=' + evmAddress
).then(r => r.json());

// 2. Sign message with EVM wallet (e.g., MetaMask)
const signature = await ethereum.request({
  method: 'personal_sign',
  params: [message, evmAddress]
});

// 3. Login
const { accessToken, user } = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: evmAddress, signature })
}).then(r => r.json());
```

## Agent Wallet Flow

1. User logs in with EVM wallet
2. Backend creates agent wallet: `POST /api/v1/hypercore/agent` (zero input)
3. Backend returns `agentAddress`
4. User calls Hyperliquid's `ApproveAgent` with the `agentAddress`
5. Agent wallet can now trade on behalf of user

## Trading Flow

```typescript
// 1. Create agent wallet (if not exists)
const { agentAddress } = await fetch('/api/v1/hypercore/agent', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

// 2. Open a market order (BUY 10 SUI)
await fetch('/api/v1/hypercore/orders/market/open', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    coin: 'SUI',
    isBuy: true,
    size: '10'
  })
});

// 3. Place Stop Loss
await fetch('/api/v1/hypercore/orders/stop-loss', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    coin: 'SUI',
    isBuy: true,  // Same as position direction
    size: '10',
    stopLossPrice: '3.50',
    stopLossTrigger: '3.55'
  })
});

// 4. Place Take Profit
await fetch('/api/v1/hypercore/orders/take-profit', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    coin: 'SUI',
    isBuy: true,  // Same as position direction
    size: '10',
    takeProfitPrice: '4.50',
    takeProfitTrigger: '4.45'
  })
});
```

## Testing Scripts

```bash
# Generate EVM signature for testing (requires TEST_EVM_PRIVATE_KEY in .env)
npx tsx scripts/evm-sign.ts <nonce>
npx tsx scripts/evm-sign.ts 478732
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

## License

MIT
