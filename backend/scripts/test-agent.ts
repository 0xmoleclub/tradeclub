#!/usr/bin/env tsx
import 'dotenv/config';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3002';
const AGENT_API_KEY = process.env.AGENT_API_KEY;

async function fetchSkill() {
  console.log('→ Fetching skill.md');
  const res = await fetch(`${API_BASE}/skill.md`);
  if (!res.ok) throw new Error(`skill.md failed: ${res.status}`);
  const text = await res.text();
  console.assert(text.includes('tradeclub-agent'), 'skill.md should contain tradeclub-agent identifier');
  console.assert(text.includes('X-Agent-API-Key'), 'skill.md should mention X-Agent-API-Key');
  console.log('✓ skill.md looks valid');
  return text;
}

async function arenaGet(path: string) {
  const headers: Record<string, string> = {};
  if (AGENT_API_KEY) headers['X-Agent-API-Key'] = AGENT_API_KEY;
  const res = await fetch(`${API_BASE}/api/v1${path}`, { headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function arenaPost(path: string, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (AGENT_API_KEY) headers['X-Agent-API-Key'] = AGENT_API_KEY;
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function run() {
  console.log('=== TradeClub Agent Smoke Test ===\n');

  await fetchSkill();

  if (!AGENT_API_KEY) {
    console.warn('⚠ AGENT_API_KEY not set. Skipping authenticated tests.');
    console.warn('  Register an agent and set AGENT_API_KEY to test arena endpoints.\n');
    process.exit(0);
  }

  // Test auth
  console.log('→ Testing arena auth');
  const noAuth = await (await fetch(`${API_BASE}/api/v1/arena/battles/active`)).status;
  console.assert(noAuth === 401, 'Unauthenticated request should return 401');

  const activeBattles = await arenaGet('/arena/battles/active');
  console.assert(activeBattles.status === 200, 'Authenticated request should return 200');
  console.log('✓ Auth works');

  // Test active battles
  console.log('→ Checking active battles');
  const battles = activeBattles.body ?? [];
  console.log(`  Found ${battles.length} active battle(s)`);

  if (battles.length > 0) {
    const battleId = battles[0].battleId;
    console.log(`→ Fetching battle state for ${battleId}`);
    const state = await arenaGet(`/arena/battles/${battleId}/state`);
    console.assert(state.status === 200, 'Battle state should return 200');
    console.log('✓ Battle state readable');

    // Try a market order — may succeed or fail depending on Hyperliquid config
    console.log('→ Attempting market order (BTC 0.001)');
    const order = await arenaPost('/arena/orders/market', { coin: 'BTC', isBuy: true, size: '0.001' });
    console.log(`  Order response: ${order.status}`, JSON.stringify(order.body));
    if (order.status === 200 || order.status === 201) {
      console.log('✓ Market order accepted');
    } else if (order.status === 403) {
      console.log('✓ Market order correctly rejected (no active battle or not PLAYING)');
    } else {
      console.log('⚠ Unexpected order response (may be Hyperliquid config related)');
    }
  } else {
    console.log('→ No active battles. Testing order rejection.');
    const order = await arenaPost('/arena/orders/market', { coin: 'BTC', isBuy: true, size: '0.001' });
    console.assert(order.status === 403, 'Order without active battle should return 403');
    console.log('✓ Correctly rejected with 403');
  }

  // Prediction market quote
  console.log('→ Testing prediction market quote endpoint');
  const quote = await arenaGet('/arena/markets/dummy-question-id/quote?outcome=0&shares=1000000000000000000');
  if (quote.status === 404) {
    console.log('✓ Quote endpoint reachable (404 expected for dummy question)');
  } else if (quote.status === 200) {
    console.log('✓ Quote returned:', JSON.stringify(quote.body));
  }

  console.log('\n=== Smoke test complete ===');
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
