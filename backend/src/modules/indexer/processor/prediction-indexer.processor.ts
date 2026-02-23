import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { LoggerService } from '@shared/logger/logger.service';
import { CacheService } from '@shared/cache/cache.service';
import { PredictionContractService } from '@/modules/prediction-market/services/prediction-contract.service';
import { INDEXER_QUEUE_PREDICTION_MARKET } from '../constants/indexer-queue.constants';
import {
  CACHE_KEY_MARKET_ADDRESSES,
  cacheKeyMarketBattleId,
} from '../constants/indexer-cache.constants';
import {
  INDEXER_PREDICTION_JOB,
  MarketCreatedJob,
  PredictionOrderJob,
  TradeJob,
} from '../types/indexer-prediction-job.type';
import { normalizeEvmAddress } from '@/shared/utils/address';

@Processor(INDEXER_QUEUE_PREDICTION_MARKET)
export class PredictionIndexerProcessor extends WorkerHost {
  // Map from job name to handler function
  private readonly handlerMapping: Record<string, Function> = {
    [INDEXER_PREDICTION_JOB.HANDLE_MARKET_CREATED]: (
      job: Job<MarketCreatedJob>,
    ) => this.handleMarketCreated(job),
    [INDEXER_PREDICTION_JOB.HANDLE_TRADE_EVENT]: (job: Job<TradeJob>) =>
      this.handleTrade(job),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
    private readonly contractService: PredictionContractService,
  ) {
    super();
  }

  async process(job: Job<PredictionOrderJob>) {
    const handler = this.handlerMapping[job.name];
    if (!handler) {
      this.logger.warn(
        `No handler found for job ${job.name} (job ${job.id}) in PredictionMarketIndexerProcessor`,
      );
      return;
    }

    try {
      await handler(job);
    } catch (err) {
      this.logger.error(`Error processing job ${job.name}: ${err}`);
      throw err;
    }
  }

  async handleTrade(job: Job<TradeJob>): Promise<void> {
    const {
      txHash,
      blockNumber,
      marketAddress,
      trader,
      outcome,
      shares,
      cost,
      isBuy,
    } = job.data;

    this.logger.log(
      `Processing Trade: market=${marketAddress}, trader=${trader}, ` +
        `outcome=${outcome}, isBuy=${isBuy}, block=${blockNumber}`,
    );

    // Resolve battleId from Redis market→battle mapping
    const battleId = await this.cacheService.getRedis<string>(
      cacheKeyMarketBattleId(marketAddress),
    );
    if (!battleId) {
      this.logger.warn(
        `No battleId cached for market ${marketAddress} — skipping trade tx=${txHash}`,
      );
      return;
    }

    await this.prisma.$transaction(async (trx) => {
      // USD tokens has 6 decimals — convert raw cost to decimal USD
      const USD_DECIMALS = new Prisma.Decimal(1_000_000);
      const WAD = new Prisma.Decimal(1e18);
      const costDecimal = new Prisma.Decimal(cost).div(USD_DECIMALS);
      const sharesDecimal = new Prisma.Decimal(shares).div(WAD);

      // Fetch the latest LMSR outcome price from the contract
      const latestPriceDecimal = await this.contractService.getOutcomePrice(
        marketAddress,
        outcome,
      );

      const question = await trx.battlePredictionQuestion.update({
        where: { marketAddress },
        data: {
          volume: { increment: costDecimal },
          shares: isBuy
            ? { increment: sharesDecimal }
            : { decrement: sharesDecimal },
          size: isBuy ? { increment: costDecimal } : { decrement: costDecimal },
        },
      });

      if (!question) {
        this.logger.error(
          `No BattlePredictionQuestion found for marketAddress=${marketAddress} — skipping trade tx=${txHash}`,
        );
        throw new Error('BattlePredictionQuestion not found for trade event');
      }

      await trx.battlePredictionTrade.create({
        data: {
          txHash,
          blockNumber,
          type: isBuy ? 'BUY' : 'SELL',
          shares: sharesDecimal,
          priceUsd: latestPriceDecimal,
          costUsd: costDecimal,
          userAddress: trader,
          battleId,
          battlePredictionQuestionId: question.id,
          marketAddress,
        },
      });

      await trx.battlePredictionChoice.upsert({
        where: {
          battleId_battlePredictionQuestionId_outcome: {
            battleId: battleId,
            battlePredictionQuestionId: question.id,
            outcome,
          },
        },
        create: {
          battleId,
          battlePredictionQuestionId: question.id,
          outcome,
          price: latestPriceDecimal,
          volume: costDecimal,
          shares: isBuy ? sharesDecimal : 0,
          size: isBuy ? costDecimal : 0,
        },
        update: {
          price: latestPriceDecimal,
          volume: { increment: costDecimal },
          shares: isBuy
            ? { increment: sharesDecimal }
            : { decrement: sharesDecimal },
          size: isBuy ? { increment: costDecimal } : { decrement: costDecimal },
        },
      });

      this.logger.log(
        `Persisted Trade: battleId=${battleId}, outcome=${outcome}, ` +
          `${isBuy ? 'BUY' : 'SELL'} ${shares} shares @ ${latestPriceDecimal.toFixed(6)} USDC`,
      );
    });
  }

  private async handleMarketCreated(job: Job<MarketCreatedJob>): Promise<void> {
    let {
      matchId,
      questionId,
      market, // contract address
      outcomesCount,
      feeBps,
      blockNumber,
    } = job.data;

    // Normalize bytes16 hex → dashed UUID
    matchId = this.bytes16ToUuid(matchId);
    questionId = this.bytes16ToUuid(questionId);

    this.logger.log(
      `Processing MarketCreated: matchId=${matchId}, market=${market}, ` +
        `outcomesCount=${outcomesCount}, feeBps=${feeBps}, block=${blockNumber}`,
    );

    const marketAddress: string = normalizeEvmAddress(market);

    // Persist market address to the known-markets set (used by chain-indexer
    // to build Trade event filters dynamically)
    await this.cacheService.sadd(CACHE_KEY_MARKET_ADDRESSES, marketAddress);

    // Cache market address → battleId for Trade event processor lookups
    await this.cacheService.setRedis(
      cacheKeyMarketBattleId(marketAddress),
      matchId,
    );

    await this.prisma.battlePredictionQuestion.upsert({
      where: {
        id: questionId,
        battleId: matchId,
      },
      create: {
        id: questionId,
        battleId: matchId,
        marketAddress,
        questionText: 'Who will win the battle?',
        description:
          'Predict which player will win the battle based on who has the highest PnL at the end.',
      },
      update: {
        marketAddress,
      },
    });
  }

  /**
   * Converts a bytes16 value back to a standard dashed UUID.
   *
   * Handles three input formats:
   *  1. Already a dashed UUID:  "3fe3df61-da6e-4585-b63b-f47867fab56e"
   *  2. 0x-prefixed hex:        "0x3fe3df61da6e4585b63bf47867fab56e"
   *  3. Decimal integer string: "16428771705006291268949899526278677566..."
   */
  private bytes16ToUuid(value: string): string {
    // 1. Already a valid dashed UUID
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      return value.toLowerCase();
    }

    let h: string;

    // 2. Hex string (with or without 0x prefix)
    if (/^(0x)?[0-9a-f]+$/i.test(value)) {
      h = value.replace(/^0x/i, '').toLowerCase();
    }
    // 3. Decimal integer — bytes16 indexed topics arrive as uint256 decimal
    else if (/^\d+$/.test(value)) {
      h = BigInt(value).toString(16);
    } else {
      throw new Error(`bytes16ToUuid: unrecognised format "${value}"`);
    }

    // bytes16 is left-aligned in a 32-byte slot: UUID = first 32 hex chars.
    // Pad short values (shouldn't happen) or truncate the right-side zeros.
    if (h.length < 32) {
      h = h.padStart(32, '0');
    } else if (h.length > 32) {
      h = h.slice(0, 32);
    }

    return [
      h.slice(0, 8),
      h.slice(8, 12),
      h.slice(12, 16),
      h.slice(16, 20),
      h.slice(20, 32),
    ].join('-');
  }
}
