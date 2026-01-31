# TradeClub Backend API

A NestJS backend API for TradeClub with Solana wallet authentication and agent wallet delegation.

## Features

- **Wallet Authentication**: Signature-based auth using Solana
  - Nonce-based signature verification
  - JWT token issuance after signature validation
  - Automatic user creation on first login
- **Agent Wallet**: Platform-managed wallet for Drift Protocol delegation
  - User creates agent wallet via API
  - User delegates trading authority on Drift Protocol
  - Funds stay in user's wallet - agent only has trading authority
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
- `GET /api/v1/auth/nonce?walletAddress=...` - Get nonce for signing
- `POST /api/v1/auth/login` - Login with signature
  ```json
  {
    "walletAddress": "7xKX...",
    "signature": "5Hd..."
  }
  ```
- `GET /api/v1/auth/check` - Validate JWT token (requires auth)
- `GET /api/v1/auth/me` - Get current user profile (requires auth)

### Agent Wallet
- `POST /api/v1/agent-wallets` - Create agent wallet (authenticated)
- `GET /api/v1/agent-wallets/me` - Get my agent wallet
- `PATCH /api/v1/agent-wallets/:id/delegate` - Mark as delegated

### Users
- `GET /api/v1/users` - Get all users (Admin/Moderator)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/liveness` - Kubernetes liveness probe

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
