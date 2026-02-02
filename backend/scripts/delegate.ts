#!/usr/bin/env tsx
/**
 * Set agent wallet as delegate on Drift Protocol
 * 
 * Usage:
 *   npx tsx scripts/delegate.ts
 * 
 * Required env:
 *   TEST_WALLET_SECRET_KEY=base58_secret_key
 *   TEST_WALLET_ADDRESS=base58_public_key
 *   API_URL=http://localhost:3002/api/v1 (optional)
 */

import 'dotenv/config';
import { Keypair, Connection, Transaction, clusterApiUrl } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

const API_URL = process.env.API_URL || 'http://localhost:3002/api/v1';
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';

async function login(secretKey: Uint8Array, walletAddress: string): Promise<string> {
  console.log('🔐 Logging in...');
  
  const nonceRes = await fetch(`${API_URL}/auth/nonce?walletAddress=${walletAddress}`);
  const nonceData = await nonceRes.json();
  const nonce = nonceData.data.nonce;
  
  const message = `Sign this message to verify your wallet. Nonce: ${nonce}`;
  const signature = nacl.sign.detached(new TextEncoder().encode(message), secretKey);
  
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      signature: bs58.encode(signature),
    }),
  });
  
  const loginData = await loginRes.json();
  console.log('✅ Logged in');
  return loginData.data.accessToken;
}

async function main() {
  const secretKeyBase58 = process.env.TEST_WALLET_SECRET_KEY;
  const walletAddress = process.env.TEST_WALLET_ADDRESS;

  if (!secretKeyBase58 || !walletAddress) {
    console.error('❌ Missing TEST_WALLET_SECRET_KEY or TEST_WALLET_ADDRESS');
    process.exit(1);
  }

  const secretKey = bs58.decode(secretKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);

  if (keypair.publicKey.toBase58() !== walletAddress) {
    console.error('❌ Secret key mismatch');
    process.exit(1);
  }

  console.log(`🚀 Delegating for ${walletAddress.slice(0, 20)}...`);

  try {
    const token = await login(secretKey, walletAddress);

    // Get unsigned transaction
    console.log('📋 Getting transaction...');
    const txRes = await fetch(`${API_URL}/drift/account/delegation-tx`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const txData = await txRes.json();
    const data = txData.data || txData;
    
    if (!txData.success && !data.success) {
      throw new Error(data.message || data.error);
    }

    console.log('✍️  Signing...');
    const txBuffer = Buffer.from(data.transaction, 'base64');
    const transaction = Transaction.from(txBuffer);
    transaction.sign(keypair);
    const signedTx = transaction.serialize().toString('base64');

    // Submit
    console.log('📤 Submitting...');
    const submitRes = await fetch(`${API_URL}/drift/account/set-delegate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ signedTransaction: signedTx }),
    });

    const result = await submitRes.json();
    const resData = result.data || result;
    
    if (!result.success && !resData.success) {
      throw new Error(resData.error);
    }

    console.log('');
    console.log('🎉 Delegated! Transaction:', resData.signature);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
