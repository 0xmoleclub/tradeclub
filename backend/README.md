# TradeClub Web3 Backend API

A modular NestJS backend API for TradeClub with Web3 signature-based authentication.

## Features

- **Web3 Authentication**: Signature-based auth using ethers.js
  - Nonce-based signature verification
  - JWT token issuance after signature validation
  - Automatic user creation on first login
- **Modular Architecture**: Clean separation of concerns
- **Database Integration**: TypeORM with PostgreSQL
- **API Documentation**: Swagger/OpenAPI integration
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston logger with daily rotation
- **Health Checks**: Kubernetes-ready health endpoints

## Web3 Authentication Flow

1. **Get Nonce**: `GET /api/auth/nonce?walletAddress=0x...`
   - Returns a nonce and message to sign
   - Creates user if wallet address doesn't exist

2. **Sign Message**: User signs the message with their wallet
   - Message format: `Please sign this message to verify your address. Nonce: {nonce}`

3. **Login**: `POST /api/auth/login`
   - Send wallet address and signature
   - Returns JWT access token

4. **Authenticated Requests**: Include `Authorization: Bearer {token}` header

## Project Structure

```
src/
├── app.module.ts              # Root application module
├── main.ts                    # Application entry point
├── config/                    # Configuration files
├── database/                  # Database module
├── shared/                    # Shared services (global)
├── common/                    # Common utilities
│   ├── decorators/            # @CurrentUser, @Public, @Roles
│   ├── enums/                 # Enums
│   ├── filters/               # Exception filters
│   ├── guards/                # Auth guards
│   ├── interceptors/          # Interceptors
│   ├── interfaces/            # TypeScript interfaces
│   └── pipes/                 # Custom pipes
└── modules/                   # Feature modules
    ├── auth/                  # Web3 Auth module
    │   ├── auth.service.ts    # Signature verification
    │   ├── auth.controller.ts # Login & nonce endpoints
    │   ├── strategies/        # JWT strategy
    │   └── dto/               # Login & nonce DTOs
    ├── users/                 # Users module
    │   ├── entities/user.entity.ts
    │   ├── users.service.ts   # User CRUD & nonce management
    │   └── users.controller.ts
    └── health/                # Health check module
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update environment variables in .env
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3002` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `tradeclub` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_ACCESS_EXPIRATION` | Access token expiration | `1d` |

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, Swagger documentation is available at:

```
http://localhost:3002/docs
```

## API Endpoints

### Authentication (Web3)
- `GET /api/auth/nonce?walletAddress=0x...` - Get nonce for signing
- `POST /api/auth/login` - Login with signature
  ```json
  {
    "walletAddress": "0x...",
    "signature": "0x..."
  }
  ```
- `GET /api/auth/check` - Validate JWT token (requires auth)
- `GET /api/auth/me` - Get current user profile (requires auth)

### Users
- `GET /api/users` - Get all users (Admin/Moderator only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user (Admin only)
- `PATCH /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user (Admin only)

### Health
- `GET /api/health` - Full health check (DB connectivity)
- `GET /api/health/liveness` - Kubernetes liveness probe

## Web3 Login Example

```typescript
// 1. Get nonce
const { nonce, message } = await fetch(
  '/api/auth/nonce?walletAddress=' + walletAddress
).then(r => r.json());

// 2. Sign message with wallet (e.g., ethers.js, wagmi)
const signature = await signer.signMessage(message);

// 3. Login
const { accessToken, user } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress, signature })
}).then(r => r.json());

// 4. Use token for authenticated requests
const profile = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT
