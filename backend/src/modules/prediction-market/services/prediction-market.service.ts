import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-job.type';
import { Queue } from 'bullmq';
import { CONTRACT_CALL_QUEUE } from '../constants/queues.constants';
import { PrismaService } from '@/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChainConfig } from '@config/chain.config';
import {
  OrderbookLevel,
  OrderbookResponse,
  OutcomeOrderbook,
} from '../types/prediction-market.type';
import {
  BattleMarketsResponseDto,
  ChoiceStateDto,
  MarketStateDto,
  MarketStatus,
  UserPositionResponseDto,
} from '../../battle/dto/battle-prediction.dto';

@Injectable()
export class PredictionMarketService {
  constructor(
    @InjectQueue(CONTRACT_CALL_QUEUE)
    private readonly contractCallQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async enqueueCreateMarket(params: CreateMarketJob): Promise<void> {
    const jobId = `prediction-market:create:${params.matchId}`;
    await this.contractCallQueue.add(
      PREDICTION_MARKET_JOBS.CREATE_MARKET,
      params,
      {
        jobId,
      },
    );
  }

  async enqueueProposeOutcome(params: ProposeOutcomeJob): Promise<void> {
    const jobId = `prediction-market:propose:${params.matchId}`;
    await this.contractCallQueue.add(
      PREDICTION_MARKET_JOBS.PROPOSE_OUTCOME,
      params,
      {
        jobId,
      },
    );
  }

  // LMSR Synthetic Orderbook

  /**
   * Returns a synthetic LMSR orderbook for a prediction market.
   *
   * Each outcome has `nLevels` ask levels (cumulative cost to push price UP by
   * multiples of `step`) and `nLevels` bid levels (cumulative proceeds from
   * selling shares to push price DOWN).
   *
   * Shares and costs use the same WAD denominator as the contract; they are
   * returned as float values (i.e. already divided by 1e18).
   */
  async getOrderbook(
    marketAddress: string,
    nLevels = 20,
    step = 0.01,
  ): Promise<OrderbookResponse> {
    const question =
      await this.prisma.battlePredictionQuestion.findUniqueOrThrow({
        where: { marketAddress },
        include: { choices: true },
      });

    // WAD-normalised b parameter
    const b = Number(question.bScore) / 1e18;

    // Determine number of outcomes from DB choices (min 2)
    const outcomesCount = Math.max(
      question.choices.reduce((max, c) => Math.max(max, c.outcome + 1), 0),
      2,
    );

    // WAD-normalised shares indexed by outcome
    const q: number[] = Array(outcomesCount).fill(0);
    for (const c of question.choices) {
      const idx = c.outcome;
      if (idx >= 0 && idx < outcomesCount) {
        q[idx] = Number(c.shares) / 1e18;
      }
    }

    const outcomes: OutcomeOrderbook[] = q.map((_, i) => {
      const currentPrice = this.lmsrSpotPrice(q, b, i);

      const asks: OrderbookLevel[] = [];
      for (let l = 1; l <= nLevels; l++) {
        const targetPrice = +(currentPrice + l * step).toFixed(6);
        if (targetPrice >= 0.99) break;
        const level = this.lmsrAskLevel(q, b, i, targetPrice);
        if (!level) break;
        asks.push(level);
      }

      const bids: OrderbookLevel[] = [];
      for (let l = 1; l <= nLevels; l++) {
        const targetPrice = +(currentPrice - l * step).toFixed(6);
        if (targetPrice <= 0.01) break;
        const level = this.lmsrBidLevel(q, b, i, targetPrice);
        if (!level) break;
        bids.push(level);
      }

      return { outcome: i, currentPrice, asks, bids };
    });

    return {
      marketAddress,
      bScore: question.bScore.toString(),
      outcomesCount,
      outcomes,
    };
  }

  /**
   * Returns the onchain contract addresses and chain ID needed by the
   * frontend to call PredictionMarket.buy() / sell() directly.
   * Used by GET /battle/:battleId/markets/:questionId/chain-info
   */
  async getMarketChainInfo(questionId: string): Promise<{
    marketAddress: string | null;
    usdcAddress: string;
    chainId: number;
  }> {
    const question =
      await this.prisma.battlePredictionQuestion.findUniqueOrThrow({
        where: { id: questionId },
        select: { marketAddress: true },
      });
    const chain = this.config.getOrThrow<ChainConfig>('chain');
    return {
      marketAddress: question.marketAddress ?? null,
      usdcAddress: chain.evm.contracts.stablecoin,
      chainId: chain.evm.chainId,
    };
  }

  // ── Battle-scoped read methods ─────────────────────────────────────────────

  /**
   * Returns all prediction markets for a battle with live LMSR spot prices.
   * Used by GET /battle/:battleId/markets
   */
  async getMarketsByBattle(
    battleId: string,
  ): Promise<BattleMarketsResponseDto> {
    const questions = await this.prisma.battlePredictionQuestion.findMany({
      where: { battleId },
      include: {
        choices: true,
        results: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const markets: MarketStateDto[] = questions.map((q) => {
      const b = Number(q.bScore) / 1e18;
      const outcomesCount = Math.max(
        q.choices.reduce((max, c) => Math.max(max, c.outcome + 1), 0),
        2,
      );

      // Build share vector indexed by outcome
      const shareVec: number[] = Array(outcomesCount).fill(0);
      for (const c of q.choices) {
        if (c.outcome >= 0 && c.outcome < outcomesCount) {
          shareVec[c.outcome] = Number(c.shares) / 1e18;
        }
      }

      const resolvedOutcome = q.results[0]?.outcome ?? null;
      const status: MarketStatus =
        resolvedOutcome !== null
          ? MarketStatus.RESOLVED
          : q.marketAddress
            ? MarketStatus.ACTIVE
            : MarketStatus.PENDING;

      const choices: ChoiceStateDto[] = q.choices.map((c) => ({
        outcome: c.outcome,
        spotPrice: this.lmsrSpotPrice(shareVec, b, c.outcome).toFixed(6),
        shares: c.shares.toString(),
        volume: c.volume.toString(),
      }));

      return {
        id: q.id,
        questionText: q.questionText,
        description: q.description ?? null,
        marketAddress: q.marketAddress ?? null,
        bScore: q.bScore.toString(),
        status,
        outcomesCount,
        totalVolume: q.volume.toString(),
        choices,
        resolvedOutcome,
      };
    });

    return { battleId, markets };
  }

  /**
   * Returns the aggregate prediction position of a wallet for one question.
   * Per-outcome breakdown will be available once BattlePredictionTrade gains
   * an `outcome` column (Phase 2).
   * Used by GET /battle/:battleId/markets/:questionId/position
   */
  async getUserPosition(
    questionId: string,
    walletAddress: string,
  ): Promise<UserPositionResponseDto> {
    const question =
      await this.prisma.battlePredictionQuestion.findUniqueOrThrow({
        where: { id: questionId },
      });

    const trades = await this.prisma.battlePredictionTrade.findMany({
      where: {
        battlePredictionQuestionId: questionId,
        userAddress: walletAddress,
      },
      orderBy: { createdAt: 'asc' },
    });

    let netShares = 0;
    let totalCostBuy = 0;
    let totalSharesBought = 0;

    for (const t of trades) {
      const s = Number(t.shares) / 1e18;
      const cost = Number(t.costUsd) / 1e18;
      if (t.type === 'BUY') {
        netShares += s;
        totalCostBuy += cost;
        totalSharesBought += s;
      } else {
        netShares -= s;
      }
    }

    const avgEntryPrice =
      totalSharesBought > 0 ? totalCostBuy / totalSharesBought : 0;

    return {
      walletAddress,
      questionId,
      marketAddress: question.marketAddress ?? null,
      netShares: netShares.toFixed(6),
      avgEntryPrice: avgEntryPrice.toFixed(6),
      totalCostUsd: totalCostBuy.toFixed(6),
    };
  }

  // LMSR Helpers

  /** Spot price for outcome i given current share vector q and liquidity b. */
  private lmsrSpotPrice(q: number[], b: number, i: number): number {
    const max = Math.max(...q.map((qi) => qi / b));
    const expQ = q.map((qi) => Math.exp(qi / b - max));
    const sumExp = expQ.reduce((a, x) => a + x, 0);
    return expQ[i] / sumExp;
  }

  /**
   * log-sum-exp trick: ln(Σ exp(q_j / b)).
   * Numerically stable for large/small q values.
   */
  private lnSumExp(q: number[], b: number): number {
    const max = Math.max(...q.map((qi) => qi / b));
    const sum = q.reduce((acc, qi) => acc + Math.exp(qi / b - max), 0);
    return Math.log(sum) + max;
  }

  /**
   * LMSR cost to buy (delta > 0) or sell (delta < 0) `delta` shares of
   * outcome `i`.  Result is in the same units as b (WAD-normalised USDC).
   */
  private lmsrCost(q: number[], b: number, i: number, delta: number): number {
    const qAfter = [...q];
    qAfter[i] += delta;
    return b * (this.lnSumExp(qAfter, b) - this.lnSumExp(q, b));
  }

  /**
   * Closed-form delta (shares) required to move outcome i's spot price to
   * `targetPrice`.
   *
   * Derivation:
   *   price_i = exp(q_i/b) / Σexp(q_j/b) = targetPrice
   *   Let S = Σ_{j≠i} exp(q_j/b)  (sum excluding i, in scaled space).
   *   x* = S * targetPrice / (1 − targetPrice)
   *   (q_i + Δ)/b = ln(x*) + max_offset
   *   Δ = b*(ln(x*) + max) − q_i
   */
  private lmsrDeltaForTargetPrice(
    q: number[],
    b: number,
    i: number,
    targetPrice: number,
  ): number {
    const max = Math.max(...q.map((qi) => qi / b));
    const expQ = q.map((qi) => Math.exp(qi / b - max));
    const sumAll = expQ.reduce((a, x) => a + x, 0);
    const S = sumAll - expQ[i]; // sum excluding i (scaled)
    const x = (S * targetPrice) / (1 - targetPrice);
    if (x <= 0) return 0;
    return b * (Math.log(x) + max) - q[i];
  }

  /** Single ask level: cumulative cost (USDC) to move price up to targetPrice. */
  private lmsrAskLevel(
    q: number[],
    b: number,
    i: number,
    targetPrice: number,
  ): OrderbookLevel | null {
    const delta = this.lmsrDeltaForTargetPrice(q, b, i, targetPrice);
    if (delta <= 1e-12) return null;
    const costUsd = this.lmsrCost(q, b, i, delta);
    if (costUsd <= 0) return null;
    return { price: targetPrice, shares: delta, costUsd };
  }

  /** Single bid level: cumulative proceeds (USDC) from selling down to targetPrice. */
  private lmsrBidLevel(
    q: number[],
    b: number,
    i: number,
    targetPrice: number,
  ): OrderbookLevel | null {
    const delta = this.lmsrDeltaForTargetPrice(q, b, i, targetPrice); // negative
    if (delta >= -1e-12) return null;
    const proceedsUsd = -this.lmsrCost(q, b, i, delta); // cost is negative for sells
    if (proceedsUsd <= 0) return null;
    return { price: targetPrice, shares: Math.abs(delta), proceedsUsd };
  }
}
