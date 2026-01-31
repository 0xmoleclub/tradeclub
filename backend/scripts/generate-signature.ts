/**
 * Solana Signature Generator Script
 * 
 * Usage:
 *   npx ts-node scripts/generate-signature.ts <wallet_address> [nonce]
 * 
 * If no wallet address provided, generates a new keypair
 * If no nonce provided, fetches from API first
 * 
 * Example:
 *   npx ts-node scripts/generate-signature.ts
 *   npx ts-node scripts/generate-signature.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
 *   npx ts-node scripts/generate-signature.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 123456
 */

import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

const API_URL = process.env.API_URL || 'http://localhost:3002/api';

interface NonceResponse {
  success: boolean;
  data: {
    nonce: string;
    message: string;
  };
}

async function fetchNonce(walletAddress: string): Promise<string> {
  const response = await fetch(
    `${API_URL}/auth/nonce?walletAddress=${walletAddress}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch nonce: ${response.statusText}`);
  }
  
  const result: NonceResponse = await response.json();
  return result.data.nonce;
}

function signMessage(message: string, secretKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return bs58.encode(signature);
}

async function main() {
  let walletAddress: string;
  let secretKey: Uint8Array;
  let isNewWallet = false;

  // Check if wallet address provided
  const argsWallet = process.argv[2];
  const argsNonce = process.argv[3];

  if (argsWallet) {
    // Use provided wallet
    walletAddress = argsWallet;
    console.log('🔑 Using provided wallet:', walletAddress);
    console.log('⚠️  You need to provide the secret key manually in the script');
    console.log('   Or generate a new wallet below\n');
    
    // For existing wallet, you need to input secret key
    // This is just for testing - in real scenario you'd use your wallet
    console.log('💡 To sign with existing wallet, modify this script to import your key');
    console.log('   For now, generating a new test wallet...\n');
    
    const keypair = Keypair.generate();
    walletAddress = keypair.publicKey.toBase58();
    secretKey = keypair.secretKey;
    isNewWallet = true;
  } else {
    // Generate new wallet
    const keypair = Keypair.generate();
    walletAddress = keypair.publicKey.toBase58();
    secretKey = keypair.secretKey;
    isNewWallet = true;
  }

  console.log('=================================');
  console.log('🆕 New Test Wallet Generated');
  console.log('=================================');
  console.log('Public Key (Wallet Address):');
  console.log(walletAddress);
  console.log('\nSecret Key (Save this!):');
  console.log(bs58.encode(secretKey));
  console.log('=================================\n');

  // Get nonce
  let nonce: string;
  if (argsNonce) {
    nonce = argsNonce;
    console.log('📝 Using provided nonce:', nonce);
  } else {
    console.log('📡 Fetching nonce from API...');
    try {
      nonce = await fetchNonce(walletAddress);
      console.log('✅ Nonce received:', nonce);
    } catch (error) {
      console.error('❌ Failed to fetch nonce:', error);
      console.log('\n💡 Make sure the server is running:');
      console.log('   pnpm run start:dev');
      process.exit(1);
    }
  }

  // Prepare message
  const message = `Sign this message to verify your wallet. Nonce: ${nonce}`;
  console.log('\n📜 Message to sign:', message);

  // Sign
  const signature = signMessage(message, secretKey);
  console.log('\n✍️  Signature generated:');
  console.log(signature);

  // Output curl command
  console.log('\n=================================');
  console.log('🚀 Ready to Login');
  console.log('=================================');
  console.log('\n📡 cURL command:');
  console.log(`curl -X POST ${API_URL}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"${walletAddress}","signature":"${signature}"}'`);

  console.log('\n📦 JSON payload:');
  console.log(JSON.stringify({
    walletAddress,
    signature
  }, null, 2));

  if (isNewWallet) {
    console.log('\n⚠️  NOTE: This is a NEW wallet. The user has been created in DB.');
    console.log('   Save the secret key above if you want to login again!');
  }
}

main().catch(console.error);
