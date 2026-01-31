#!/usr/bin/env tsx
/**
 * Sign login message with test wallet from env
 * 
 * Usage:
 *   npx tsx scripts/sign.ts <nonce>
 * 
 * Example:
 *   npx tsx scripts/sign.ts 478732
 * 
 * Required env:
 *   TEST_WALLET_SECRET_KEY=base58_secret_key
 *   TEST_WALLET_ADDRESS=base58_public_key
 */

import 'dotenv/config';
import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

function main() {
  const nonce = process.argv[2];
  
  if (!nonce) {
    console.error('Usage: npx tsx scripts/sign.ts <nonce>');
    console.error('Example: npx tsx scripts/sign.ts 478732');
    process.exit(1);
  }

  const secretKeyBase58 = process.env.TEST_WALLET_SECRET_KEY;
  const walletAddress = process.env.TEST_WALLET_ADDRESS;

  if (!secretKeyBase58 || !walletAddress) {
    console.error('Missing env variables. Add to .env:');
    console.error('  TEST_WALLET_SECRET_KEY=your_base58_secret_key');
    console.error('  TEST_WALLET_ADDRESS=your_base58_public_key');
    process.exit(1);
  }

  // Load keypair
  const secretKey = bs58.decode(secretKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);

  // Verify
  if (keypair.publicKey.toBase58() !== walletAddress) {
    console.error('❌ Public key mismatch! Check your env variables.');
    process.exit(1);
  }

  // Sign
  const message = `Sign this message to verify your wallet. Nonce: ${nonce}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signatureBase58 = bs58.encode(signature);

  // Output
  console.log('{ \n  "walletAddress": "' + walletAddress + '", \n  "signature": "' + signatureBase58 + '"\n}');
  console.log('');
  console.log('curl:');
  console.log(`curl -X POST http://localhost:3002/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"walletAddress":"${walletAddress}","signature":"${signatureBase58}"}'`);
}

main();
