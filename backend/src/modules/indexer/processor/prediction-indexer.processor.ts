import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { LoggerService } from '@shared/logger/logger.service';
import { CacheService } from '@shared/cache/cache.service';
import { PredictionMarketContractService } from '@modules/prediction-market/services/prediction-market-contract.service';
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
    private readonly contractService: PredictionMarketContractService,
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

    await handler(job);
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

    // Find the BattleResult for this outcome index
    await this.prisma.$transaction(async (trx) => {
      const battleResult = await trx.battleResult.findFirst({
        where: { battleId },
        orderBy: { createdAt: 'asc' },
        skip: outcome, // outcome index 0 = first result, 1 = second, etc.
        select: { id: true },
      });
      if (!battleResult) {
        this.logger.warn(
          `No BattleResult found for battleId=${battleId} outcome=${outcome} — skipping trade tx=${txHash}`,
        );
        return;
      }

      // USD tokens has 6 decimals — convert raw cost to decimal USD
      const USD_DECIMALS = new Prisma.Decimal(1_000_000);
      const costDecimal = new Prisma.Decimal(cost).div(USD_DECIMALS);
      const sharesDecimal = new Prisma.Decimal(shares);

      // Fetch the latest LMSR outcome price from the contract
      const latestPriceDecimal = await this.contractService.getOutcomePrice(
        marketAddress,
        outcome,
      );

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
          battleResultId: battleResult.id,
        },
      });

      await trx.battlePredictionChoice.upsert({
        where: {
          battleId_outcome: {
            battleId: battleId,
            outcome,
          },
        },
        create: {
          battleId,
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
    const {
      matchId,
      market, // contract address
      outcomesCount,
      b,
      feeBps,
      timestamp,
      blockNumber,
    } = job.data;

    this.logger.log(
      `Processing MarketCreated: matchId=${matchId}, market=${market}, ` +
        `outcomesCount=${outcomesCount}, feeBps=${feeBps}, block=${blockNumber}`,
    );

    const matchIdUUID: string = this.toMatchIdBytes16(matchId);
    const marketAddress: string = normalizeEvmAddress(market);

    // Persist market address to the known-markets set (used by chain-indexer
    // to build Trade event filters dynamically)
    await this.cacheService.sadd(CACHE_KEY_MARKET_ADDRESSES, marketAddress);

    // Cache market address → battleId for Trade event processor lookups
    await this.cacheService.setRedis(
      cacheKeyMarketBattleId(marketAddress),
      matchIdUUID,
    );
  }

  /**
   *
   * Convert a bytes32-padded match ID back to the original 16-byte UUID string.
   * @param matchIdBytes32
   * @returns
   */
  private toMatchIdBytes16(matchIdBytes32: string): string {
    // Remove 0x prefix and take the last 32 characters (16 bytes)
    return matchIdBytes32.replace(/^0x/, '').slice(-32);
  }
}
