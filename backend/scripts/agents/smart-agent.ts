#!/usr/bin/env tsx
import 'dotenv/config';
import { TestAgent } from './TestAgent';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3002';
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-flash-1.5';
const POLL_MS = parseInt(process.env.POLL_MS ?? '10000', 10);

interface LlmResponse {
  thought: string;
  action: 'market_order' | 'limit_order' | 'buy_prediction' | 'wait' | 'noop';
  params?: Record<string, any>;
}

async function fetchSkill(): Promise<string> {
  const res = await fetch(`${API_BASE}/skill.md`);
  if (!res.ok) throw new Error(`Failed to fetch skill.md: ${res.status}`);
  return res.text();
}

async function callLlm(system: string, user: string): Promise<LlmResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://tradeclub.io',
      'X-Title': 'TradeClub Smart Agent',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const json = await res.json() as any;
  const content = json.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(content) as LlmResponse;
}

function buildSystemPrompt(skillMd: string) {
  return `You are an autonomous AI agent that has just discovered a new web application called TradeClub.

You do NOT have any prior knowledge of crypto wallets, blockchain, ERC-8004, or prediction markets.
Instead, you must learn how to operate entirely from the skill document provided below.

Your job is to read the skill document, understand the current state of the game, and decide the next best action.

Rules:
1. Always respond with valid JSON only.
2. Include a short "thought" field explaining your reasoning.
3. Choose an "action" from: ["market_order", "limit_order", "buy_prediction", "wait", "noop"]
4. If you choose an action that requires parameters, provide them in "params".

--- SKILL DOCUMENT ---
${skillMd}

--- JSON OUTPUT SCHEMA ---
{
  "thought": "string",
  "action": "market_order | limit_order | buy_prediction | wait | noop",
  "params": { }
}

For market_order params: { "coin": "BTC", "isBuy": true, "size": "0.001" }
For limit_order params:  { "coin": "BTC", "isBuy": true, "size": "0.001", "limitPrice": "65000" }
For buy_prediction params: { "questionId": "...", "outcome": 0, "sharesWad": "1000000000000000000", "maxCostUsdc": "1000000" }
`;
}

function buildUserPrompt(battleState: any) {
  return `Current battle state:
${JSON.stringify(battleState, null, 2)}

What is your next action?`;
}

async function run() {
  if (!AGENT_API_KEY) {
    console.error('Set AGENT_API_KEY env var.');
    process.exit(1);
  }
  if (!OPENROUTER_API_KEY) {
    console.error('Set OPENROUTER_API_KEY env var.');
    process.exit(1);
  }

  console.log('Smart Agent starting...');
  console.log(`API: ${API_BASE}`);
  console.log(`Model: ${OPENROUTER_MODEL}\n`);

  const skillMd = await fetchSkill();
  console.log('✓ Skill document loaded');

  const systemPrompt = buildSystemPrompt(skillMd);
  const agent = new TestAgent(API_BASE, AGENT_API_KEY);

  let lastBattleId: string | null = null;

  while (true) {
    try {
      const battles = await agent.getActiveBattles();
      const active = battles.find((b) => b.status === 'STARTED');

      if (!active) {
        if (lastBattleId) {
          console.log(`\nBattle ${lastBattleId} ended. Waiting for next match...`);
          lastBattleId = null;
        } else {
          process.stdout.write('.');
        }
        await sleep(POLL_MS);
        continue;
      }

      if (lastBattleId !== active.battleId) {
        console.log(`\n>>> Entered battle ${active.battleId}`);
        lastBattleId = active.battleId;
      }

      const state = await agent.getBattleState(active.battleId);
      console.log(`\n[State] Slot: ${state.mySlot} | Positions: ${state.positions?.positions?.length ?? 0} | Orders: ${state.orders?.orders?.length ?? 0}`);

      const userPrompt = buildUserPrompt(state);
      const decision = await callLlm(systemPrompt, userPrompt);

      console.log(`[Thought] ${decision.thought}`);
      console.log(`[Action] ${decision.action}`);

      if (decision.action === 'market_order' && decision.params) {
        const p = decision.params;
        const res = await agent.marketOrder(p.coin, p.isBuy, p.size);
        console.log(`  Result: ${res.status}`, JSON.stringify(res.data));
      } else if (decision.action === 'limit_order' && decision.params) {
        const p = decision.params;
        const res = await agent.limitOrder(p.coin, p.isBuy, p.size, p.limitPrice);
        console.log(`  Result: ${res.status}`, JSON.stringify(res.data));
      } else if (decision.action === 'buy_prediction' && decision.params) {
        const p = decision.params;
        const res = await agent.buyShares(p.questionId, p.outcome, p.sharesWad, p.maxCostUsdc);
        console.log(`  Result: ${res.status}`, JSON.stringify(res.data));
      } else {
        console.log(`  No trade this tick.`);
      }
    } catch (err: any) {
      console.error('\nAgent loop error:', err.message);
    }

    await sleep(POLL_MS);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch((err) => {
  console.error('Smart agent crashed:', err);
  process.exit(1);
});
