# Project: TradeClub Liquidator

## Project Overview

This repository contains the code for TradeClub, a competitive social copy trading platform built on the Monad blockchain. The project is structured as a monorepo with several independent sub-projects:

*   **`backend`**: A NestJS backend that provides a REST API and WebSocket server to manage matches, delegations, and trading. It also listens to blockchain events.
*   **`contracts`**: Solidity smart contracts for the core logic of the platform, including match management, non-custodial delegation, and governance.
*   **`indexer`**: An event indexer that listens to blockchain events and stores them in a queryable format.
*   **`mvp-frontend`**: A minimal Next.js frontend for testing and integration purposes.
*   **`ui`**: A more complete Next.js frontend for the platform.

The platform allows skilled traders (Monachads) to compete in trading matches, and supporters to delegate their trading authority to follow their strategies in real-time without transferring custody of their assets.

## Building and Running

### Prerequisites

*   Node.js 18+ and npm
*   PostgreSQL database
*   Deployed smart contracts on Monad

### Installation and Execution

The top-level `package.json` provides scripts to manage the sub-projects:

*   **Backend**:
    *   `npm run backend:dev`: Start the backend in development mode.
    *   `npm run backend:build`: Build the backend for production.
    *   `npm run backend:start`: Start the backend in production mode.

*   **Contracts**:
    *   `npm run contracts:compile`: Compile the smart contracts.
    *   `npm run contracts:test`: Run the smart contract tests.

*   **Frontend**:
    *   `npm run frontend:dev`: Start the `mvp-frontend` in development mode.
    *   `npm run frontend:build`: Build the `mvp-frontend` for production.

*   **Indexer**:
    *   `npm run indexer:dev`: Start the indexer in development mode.

Each sub-project also has its own `package.json` with more specific scripts. Refer to the `README.md` file in each sub-project for more detailed instructions.

## Development Conventions

*   **Backend**: The backend is built with NestJS and uses Prisma as the ORM. It follows the standard NestJS project structure.
*   **Contracts**: The smart contracts are written in Solidity and use Hardhat for development and testing.
*   **Frontend**: The frontends are built with Next.js and use RainbowKit and Wagmi for wallet connection.
*   **Code Style**: The code style is not explicitly defined, but it is recommended to follow the conventions of each framework.
