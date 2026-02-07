#!/usr/bin/env tsx
/**
 * Sign login message with EVM test wallet from env
 * 
 * Usage:
 *   npx tsx scripts/evm-sign.ts <nonce>
 * 
 * Example:
 *   npx tsx scripts/evm-sign.ts 478732
 * 
 * Required env:
 *   TEST_EVM_PRIVATE_KEY=0x...
 *   TEST_EVM_ADDRESS=0x...
 */

import 'dotenv/config';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

function main() {
  const nonce = process.argv[2];
  
  if (!nonce) {
    console.error('Usage: npx tsx scripts/evm-sign.ts <nonce>');
    console.error('Example: npx tsx scripts/evm-sign.ts 478732');
    process.exit(1);
  }

  const privateKey = process.env.TEST_EVM_PRIVATE_KEY as `0x${string}`;
  const walletAddress = process.env.TEST_EVM_ADDRESS;

  if (!privateKey || !walletAddress) {
    console.error('Missing env variables. Add to .env:');
    console.error('  TEST_EVM_PRIVATE_KEY=0x_your_private_key');
    console.error('  TEST_EVM_ADDRESS=0x_your_address');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey);

  // Verify
  if (account.address.toLowerCase() !== walletAddress.toLowerCase()) {
    console.error('❌ Address mismatch! Check your env variables.');
    console.error(`  Expected: ${walletAddress}`);
    console.error(`  Got: ${account.address}`);
    process.exit(1);
  }

  // Sign message (EIP-191 personal_sign)
  const message = `Sign this message to verify your wallet. Nonce: ${nonce}`;
  
  // Use the account to sign directly
  account.signMessage({ message }).then((signature) => {
    // Output
    console.log('{ ');
    console.log(`  "walletAddress": "${walletAddress}", `);
    console.log(`  "signature": "${signature}"`);
    console.log('}');
    console.log('');
    console.log('curl:');
    console.log(`curl -X POST http://localhost:3002/api/v1/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"walletAddress":"${walletAddress}","signature":"${signature}"}'`);
  }).catch((error) => {
    console.error('❌ Signing failed:', error);
    process.exit(1);
  });
}

main();
