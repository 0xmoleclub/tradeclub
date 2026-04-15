#!/usr/bin/env tsx
import 'dotenv/config';
import { TestAgent } from './TestAgent';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3002';
const API_KEY = process.env.AGENT_API_KEY;
const POLL_MS = parseInt(process.env.POLL_MS ?? '5000', 10);

const COINS = ['BTC', 'ETH', 'SOL'];
const SIZES = ['0.001', '0.002', '0.005'];

function randomCoin() {
  return COINS[Math.floor(Math.random() * COINS.length)];
}

function randomSize() {
  return SIZES[Math.floor(Math.random() * SIZES.length)];
}

function randomDirection() {
  return Math.random() > 0.5;
}

async function run() {
  if (!API_KEY) {
    console.error('Set AGENT_API_KEY env var to run the simulator.');
    process.exit(1);
  }

  const agent = new TestAgent(API_BASE, API_KEY);
  console.log(`TradeClub Test Agent starting...`);
  console.log(`API: ${API_BASE}`);
  console.log(`Poll interval: ${POLL_MS}ms\n`);

  let lastBattleId: string | null = null;
  let hasTradedThisBattle = false;

  while (true) {
    try {
      const battles = await agent.getActiveBattles();
      const active = battles.find((b) => b.status === 'STARTED');

      if (!active) {
        if (lastBattleId) {
          console.log(`Battle ${lastBattleId} ended. Waiting for next match...\n`);
          lastBattleId = null;
          hasTradedThisBattle = false;
        } else {
          process.stdout.write('.');
        }
        await sleep(POLL_MS);
        continue;
      }

      if (lastBattleId !== active.battleId) {
        console.log(`\n>>> Entered battle ${active.battleId}`);
        lastBattleId = active.battleId;
        hasTradedThisBattle = false;
      }

      const state = await agent.getBattleState(active.battleId);
      console.log(`  Slot: ${state.mySlot} | Positions: ${JSON.stringify(state.positions?.positions?.length ?? 0)} | Orders: ${JSON.stringify(state.orders?.orders?.length ?? 0)}`);

      if (!hasTradedThisBattle) {
        const coin = randomCoin();
        const size = randomSize();
        const isBuy = randomDirection();
        console.log(`  Placing market order: ${isBuy ? 'BUY' : 'SELL'} ${size} ${coin}`);
        const orderRes = await agent.marketOrder(coin, isBuy, size);
        console.log(`  Order result: ${orderRes.status}`, JSON.stringify(orderRes.data));

        // Try buying 1 share on ourselves (outcome = slot - 1) if prediction market exists
        if (state.battle.battlePredictionQuestions?.length > 0) {
          const question = state.battle.battlePredictionQuestions[0];
          const myOutcome = state.mySlot - 1;
          console.log(`  Quoting prediction shares for outcome ${myOutcome}`);
          const quote = await agent.quoteBuy(question.id, myOutcome, '1000000000000000000');
          if (quote.status === 200 && quote.data?.marketAddress) {
            console.log(`  Buying 1 share on self. Payload:`, JSON.stringify(quote.data));
            const buyRes = await agent.buyShares(question.id, myOutcome, '1000000000000000000', '10000000');
            console.log(`  Buy result: ${buyRes.status}`, JSON.stringify(buyRes.data));
          } else {
            console.log(`  Prediction market not ready: ${quote.status}`);
          }
        }

        hasTradedThisBattle = true;
      }
    } catch (err: any) {
      console.error('Agent loop error:', err.message);
    }

    await sleep(POLL_MS);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch((err) => {
  console.error('Simulator crashed:', err);
  process.exit(1);
});
