-- Migration: Initial EVM/Hypercore Schema
-- Complete database reset with clean EVM-only architecture
-- Created at: 2026-02-07T17:00:00Z

-- ============================================
-- DROP EVERYTHING (Clean Slate)
-- ============================================

-- Drop foreign keys first
ALTER TABLE IF EXISTS "AgentWallet" DROP CONSTRAINT IF EXISTS "AgentWallet_userId_fkey";
ALTER TABLE IF EXISTS "HypercoreWallet" DROP CONSTRAINT IF EXISTS "HypercoreWallet_userId_fkey";
ALTER TABLE IF EXISTS "DriftAgentWallet" DROP CONSTRAINT IF EXISTS "DriftAgentWallet_userId_fkey";

-- Drop tables
DROP TABLE IF EXISTS "AgentWallet" CASCADE;
DROP TABLE IF EXISTS "HypercoreWallet" CASCADE;
DROP TABLE IF EXISTS "DriftAgentWallet" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "UserStatus" CASCADE;
DROP TYPE IF EXISTS "AgentWalletStatus" CASCADE;

-- ============================================
-- CREATE FRESH SCHEMA (EVM/Hypercore Only)
-- ============================================

-- Enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- User Table (EVM only)
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    -- EVM wallet address
    "evmAddress" TEXT,
    
    "nonce" TEXT,
    "lastLoginAt" TIMESTAMP(3),

    -- Profile
    "name" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- User indexes
CREATE UNIQUE INDEX "User_evmAddress_key" ON "User"("evmAddress");

-- Hypercore Wallet Table (EVM Agent for Hyperliquid)
CREATE TABLE "HypercoreWallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "userId" TEXT NOT NULL,
    
    -- Agent wallet details
    "agentAddress" TEXT NOT NULL,        -- The agent's public address (used on Hyperliquid)
    "encryptedAgentKey" TEXT NOT NULL,   -- Encrypted private key for signing
    "masterAddress" TEXT,                -- Optional: user's master wallet reference
    
    "encryptionVersion" TEXT NOT NULL DEFAULT 'v1',

    CONSTRAINT "HypercoreWallet_pkey" PRIMARY KEY ("id")
);

-- HypercoreWallet indexes
CREATE UNIQUE INDEX "HypercoreWallet_userId_key" ON "HypercoreWallet"("userId");
CREATE UNIQUE INDEX "HypercoreWallet_agentAddress_key" ON "HypercoreWallet"("agentAddress");
CREATE INDEX "HypercoreWallet_userId_idx" ON "HypercoreWallet"("userId");
CREATE INDEX "HypercoreWallet_agentAddress_idx" ON "HypercoreWallet"("agentAddress");

-- Foreign keys
ALTER TABLE "HypercoreWallet" ADD CONSTRAINT "HypercoreWallet_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
