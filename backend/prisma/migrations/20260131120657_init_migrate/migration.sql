-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "AgentWalletStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nonce" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "name" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedSecretKey" TEXT NOT NULL,
    "isDelegated" BOOLEAN NOT NULL DEFAULT false,
    "delegatedAt" TIMESTAMP(3),
    "subaccountIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "AgentWalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "encryptionVersion" TEXT NOT NULL DEFAULT 'v1',

    CONSTRAINT "AgentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWallet_userId_key" ON "AgentWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWallet_publicKey_key" ON "AgentWallet"("publicKey");

-- CreateIndex
CREATE INDEX "AgentWallet_userId_idx" ON "AgentWallet"("userId");

-- CreateIndex
CREATE INDEX "AgentWallet_publicKey_idx" ON "AgentWallet"("publicKey");

-- AddForeignKey
ALTER TABLE "AgentWallet" ADD CONSTRAINT "AgentWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
