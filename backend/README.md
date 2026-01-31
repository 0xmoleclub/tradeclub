# TradeClub Backend API

A NestJS backend API for TradeClub with Solana wallet authentication and Drift Protocol integration.

## Features

- **Wallet Authentication**: Signature-based auth using Solana
  - Nonce-based signature verification
  - JWT token issuance after signature validation
  - Automatic user creation on first login
- **Agent Wallet**: Platform-managed wallet for Drift Protocol delegation
  - User creates agent wallet via API
  - User delegates trading authority on Drift Protocol
  - Funds stay in user's wallet - agent only has trading authority
- **Drift Protocol Integration**: Full perp trading
  - Deposit/withdraw collateral
  - Place/cancel orders (market, limit)
  - View positions and account info
  - Real-time market data
- **Prisma ORM**: PostgreSQL with type-safe queries
- **API Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, rate limiting, AES-256-GCM encryption

## Architecture

```
User Wallet (funds here)
    ↓
  Delegates trading authority to
    ↓
Agent Wallet (platform-managed)
    ↓
  Trades on
    ↓
Drift Protocol
```

## Database Schema (Prisma)

### User
| Field | Description |
|-------|-------------|
| `id` | UUID |
| `walletAddress` | User's Solana wallet (unique) |
| `nonce` | Auth nonce |
| `role`, `status` | User management |
| `agentWallet` | Optional 1:1 relation |

### AgentWallet
| Field | Description |
|-------|-------------|
| `id` | UUID |
| `userId` | FK to user |
| `publicKey` | Solana public key |
| `encryptedSecretKey` | AES-256-GCM encrypted (64 bytes) |
| `isDelegated` | Delegated on Drift? |
| `subaccountIndex` | Drift subaccount |

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
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_NETWORK` | Network (devnet/mainnet) | `devnet` |

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
| GET | `/api/v1/auth/nonce?walletAddress=...` | Get nonce for signing |
| POST | `/api/v1/auth/login` | Login with signature |
| GET | `/api/v1/auth/check` | Validate JWT token (auth required) |
| GET | `/api/v1/auth/me` | Get current user profile (auth required) |

### Agent Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent-wallets` | Create agent wallet (auth required) |
| GET | `/api/v1/agent-wallets/me` | Get my agent wallet |
| PATCH | `/api/v1/agent-wallets/:id/delegate` | Mark as delegated |
| PATCH | `/api/v1/agent-wallets/:id/revoke` | Revoke delegation |

### Drift Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/drift/account` | Get account info (collateral, margin, leverage) |
| POST | `/api/v1/drift/account/initialize` | Initialize Drift account |
| GET | `/api/v1/drift/positions` | Get open positions |
| GET | `/api/v1/drift/positions/:marketIndex` | Get position by market |
| GET | `/api/v1/drift/orders` | Get open orders |
| POST | `/api/v1/drift/orders` | Place order (market/limit/trigger) |
| POST | `/api/v1/drift/orders/take-profit` | Place take profit order |
| POST | `/api/v1/drift/orders/stop-loss` | Place stop loss order |
| POST | `/api/v1/drift/orders/cancel` | Cancel order |
| POST | `/api/v1/drift/orders/cancel-all` | Cancel all orders |
| POST | `/api/v1/drift/deposit` | Deposit collateral (USDC) |
| POST | `/api/v1/drift/withdraw` | Withdraw collateral |
| GET | `/api/v1/drift/markets` | Get available markets |
| GET | `/api/v1/drift/markets/:marketIndex/price` | Get market price |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | Get all users (Admin/Moderator) |
| GET | `/api/v1/users/:id` | Get user by ID |
| PATCH | `/api/v1/users/:id` | Update user |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/health/liveness` | Kubernetes liveness probe |

## Login Flow

```typescript
// 1. Get nonce
const { nonce, message } = await fetch(
  '/api/v1/auth/nonce?walletAddress=' + publicKey.toBase58()
).then(r => r.json());

// 2. Sign message with wallet (e.g., Phantom)
const encoded = new TextEncoder().encode(message);
const signed = await window.solana.signMessage(encoded);
const signature = bs58.encode(signed.signature);

// 3. Login
const { accessToken, user } = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature })
}).then(r => r.json());
```

## Agent Wallet Flow

1. User logs in with wallet auth
2. User creates agent wallet: `POST /api/v1/agent-wallets`
3. Backend generates Solana keypair, encrypts secret key
4. User delegates on Drift Protocol UI (using agent wallet public key)
5. User calls `PATCH /api/v1/agent-wallets/:id/delegate` to mark as delegated
6. Agent wallet can now trade on behalf of user

## Drift Trading Flow

```typescript
// 1. Initialize Drift account (one-time)
await fetch('/api/v1/drift/account/initialize', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 2. Deposit USDC collateral
await fetch('/api/v1/drift/deposit', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    marketIndex: 0, // USDC
    amount: '1000000000' // 1000 USDC (6 decimals)
  })
});

// 3. Place a market order
await fetch('/api/v1/drift/orders', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    marketIndex: 0, // SOL-PERP
    direction: 'LONG',
    baseAssetAmount: '1000000000', // 1 SOL
    orderType: 'MARKET'
  })
});

// 4. Place Stop Loss (at $140)
await fetch('/api/v1/drift/orders/stop-loss', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    marketIndex: 0,
    direction: 'SHORT', // Opposite of position
    baseAssetAmount: '1000000000',
    triggerPrice: '140000000', // $140
  })
});

// 5. Place Take Profit (at $180)
await fetch('/api/v1/drift/orders/take-profit', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    marketIndex: 0,
    direction: 'SHORT', // Opposite of position
    baseAssetAmount: '1000000000',
    triggerPrice: '180000000', // $180
  })
});
```

## Testing Scripts

```bash
# Generate signature for testing (requires TEST_WALLET_SECRET_KEY in .env)
npx tsx scripts/sign.ts <nonce>
npx tsx scripts/sign.ts 478732
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
