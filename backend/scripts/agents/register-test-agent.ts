#!/usr/bin/env tsx
import 'dotenv/config';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3002';
const OWNER_TOKEN = process.env.OWNER_JWT;

async function main() {
  if (!OWNER_TOKEN) {
    console.error('Set OWNER_JWT to a human Bearer token to register a test agent.');
    console.error('Example: OWNER_JWT=eyJhbG... npx tsx scripts/agents/register-test-agent.ts');
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}/api/v1/agents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OWNER_TOKEN}`,
    },
    body: JSON.stringify({
      name: `TestAgent-${Date.now()}`,
      identityRegistry: 'eip155:1:0x1111111111111111111111111111111111111111',
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Registration failed:', res.status, JSON.stringify(data));
    process.exit(1);
  }

  console.log('Agent registered!');
  console.log(`  userId:        ${data.userId}`);
  console.log(`  agentId:       ${data.agentId}`);
  console.log(`  agentAddress:  ${data.agentAddress}`);
  console.log(`  apiKey:        ${data.apiKey}`);
  console.log('\nSave this API key and run the simulator:');
  console.log(`  AGENT_API_KEY=${data.apiKey} npx tsx scripts/agents/simulator.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
