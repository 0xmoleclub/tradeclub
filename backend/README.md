# TradeClub Backend API

A modular NestJS backend API for TradeClub application.

## Features

- **Modular Architecture**: Clean separation of concerns with feature modules
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Database Integration**: TypeORM with PostgreSQL support
- **API Documentation**: Swagger/OpenAPI integration
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Logging**: Winston logger with daily rotation
- **Health Checks**: Kubernetes-ready health endpoints

## Project Structure

```
src/
├── app.module.ts              # Root application module
├── main.ts                    # Application entry point
├── config/                    # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── throttle.config.ts
├── database/                  # Database module
│   └── database.module.ts
├── shared/                    # Shared services (global)
│   ├── shared.module.ts
│   ├── logger/
│   ├── cache/
│   └── utils/
├── common/                    # Common utilities
│   ├── decorators/            # Custom decorators
│   ├── enums/                 # Enums
│   ├── filters/               # Exception filters
│   ├── guards/                # Auth guards
│   ├── interceptors/          # Interceptors
│   ├── interfaces/            # TypeScript interfaces
│   └── pipes/                 # Custom pipes
└── modules/                   # Feature modules
    ├── auth/                  # Authentication module
    ├── users/                 # Users module
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

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users` - Get all users (Admin/Moderator only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user (Admin only)
- `PATCH /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user (Admin only)

### Health
- `GET /api/health` - Full health check
- `GET /api/health/liveness` - Kubernetes liveness probe
- `GET /api/health/readiness` - Kubernetes readiness probe

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
| `JWT_ACCESS_EXPIRATION` | Access token expiration | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | `7d` |

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
