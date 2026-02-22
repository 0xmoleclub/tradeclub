import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AbiCoder, WebSocketProvider } from 'ethers';
import { keccak256, toBytes } from 'viem';
import { IndexerConfig } from '@config/indexer.config';
import { ChainConfig } from '@config/chain.config';
import {
  HypersyncService,
  HyperSyncRawLog,
  LogFilter,
} from './hypersync.service';
import { IndexerStateService } from './indexer-state.service';
import { INDEXER_QUEUE_PREDICTION_MARKET } from '../constants/indexer-queue.constants';
import { CACHE_KEY_MARKET_ADDRESSES } from '../constants/indexer-cache.constants';
import {
  INDEXER_PREDICTION_JOB,
  MarketCreatedJob,
  TradeJob,
} from '../types/indexer-prediction-job.type';
import { CacheService } from '@shared/cache/cache.service';

// ── Event signatures & selectors ─────────────────────────────────────────────
const MARKET_CREATED_SIG =
  'MarketCreated(bytes32,address,uint8,uint256,uint16)';
const MARKET_CREATED_TOPIC0 = keccak256(toBytes(MARKET_CREATED_SIG)) as string;

const TRADE_SIG = 'Trade(address,uint8,uint256,uint256,uint256)';
const TRADE_TOPIC0 = keccak256(toBytes(TRADE_SIG)) as string;

// Function selectors (first 4 bytes of keccak256 of the signature)
const BUY_SELECTOR = keccak256(toBytes('buy(uint8,uint256,uint256)')).slice(
  0,
  10,
);
const SELL_SELECTOR = keccak256(toBytes('sell(uint8,uint256,uint256)')).slice(
  0,
  10,
);

// ── Handler registry type ─────────────────────────────────────────────────────
/**
 * Describes how to process a single on-chain event type.
 * Add a new entry to `buildHandlers()` for every new event you want to index.
 */
interface EventHandlerDef {
  /** Human-readable label used in log output. */
  name: string;
  /**
   * Lower-cased address of the emitting contract.
   * Omit (undefined) for events emitted by dynamically-created contracts
   * (e.g. Trade — one per market). Those handlers get their filters built
   * at runtime via resolveAddresses().
   */
  contractAddress?: string;
  /** topic0 = keccak256(event signature). */
  topic0: string;
  /** Decode the raw log and dispatch a job to the appropriate Bull queue. */
  handle(log: HyperSyncRawLog): Promise<void>;
}

@Injectable()
export class ChainIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainIndexerService.name);

  // ── WS state ───────────────────────────────────────────────────────────────
  private provider: WebSocketProvider | null = null;
  private fallbackHandle: NodeJS.Timeout | null = null;
  private reconnectHandle: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 1_000;
  private isRunning = false;
  private readonly FALLBACK_INTERVAL_MS = 60_000;

  // ── Event handler registry (built in onModuleInit) ─────────────────────────
  private handlers!: Map<string, EventHandlerDef>;

  private get indexerCfg(): IndexerConfig {
    return this.configService.get<IndexerConfig>('indexer')!;
  }

  private get chainCfg(): ChainConfig {
    return this.configService.get<ChainConfig>('chain')!;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly hypersync: HypersyncService,
    private readonly indexerState: IndexerStateService,
    private readonly cacheService: CacheService,
    @InjectQueue(INDEXER_QUEUE_PREDICTION_MARKET)
    private readonly predictionMarketQueue: Queue<MarketCreatedJob | TradeJob>,
  ) {}

  async onModuleInit() {
    this.handlers = this.buildHandlers();
    this.logger.log(
      `Chain indexer starting — tracking ${this.handlers.size} event type(s): ` +
        [...this.handlers.values()].map((h) => h.name).join(', '),
    );
    void this.poll();
    await this.connectWebSocket();
    this.fallbackHandle = setInterval(
      () => void this.poll(),
      this.FALLBACK_INTERVAL_MS,
    );
  }

  async onModuleDestroy() {
    if (this.fallbackHandle) {
      clearInterval(this.fallbackHandle);
      this.fallbackHandle = null;
    }
    if (this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
    await this.destroyProvider();
  }

  /**
   * Handler registry
   *
   * To index a new event type:
   * 1. Define its topic0 constant above the class.
   * 2. Add an EventHandlerDef entry in the map below.
   * 3. Inject the target queue in the constructor and write a decoder method.
   */
  private buildHandlers(): Map<string, EventHandlerDef> {
    const contracts = this.chainCfg.evm.contracts;
    const map = new Map<string, EventHandlerDef>();

    // ── MarketCreated ────────────────────────────────────────────────────────
    map.set(MARKET_CREATED_TOPIC0.toLowerCase(), {
      name: 'MarketCreated',
      contractAddress: contracts.marketFactory.toLowerCase(),
      topic0: MARKET_CREATED_TOPIC0,
      handle: async (log) => {
        const job = this.decodeMarketCreated(log);
        if (!job) return;
        await this.predictionMarketQueue.add(
          INDEXER_PREDICTION_JOB.HANDLE_MARKET_CREATED,
          job,
          {
            jobId: `market-created:${job.txHash}:${job.logIndex}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
        this.logger.log(
          `Queued MarketCreated: matchId=${job.matchId}, market=${job.market}, block=${job.blockNumber}`,
        );
      },
    });

    // ── Trade (emitted by each PredictionMarket contract) ───────────────────
    // contractAddress is omitted — addresses are resolved dynamically from
    // the Redis market-address set populated by the MarketCreated handler.
    map.set(TRADE_TOPIC0.toLowerCase(), {
      name: 'Trade',
      topic0: TRADE_TOPIC0,
      handle: async (log) => {
        const job = this.decodeTradeLog(log);
        if (!job) return;
        await this.predictionMarketQueue.add(
          INDEXER_PREDICTION_JOB.HANDLE_TRADE_EVENT,
          job,
          {
            jobId: `trade:${job.txHash}:${job.logIndex}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5_000 },
          },
        );
        this.logger.log(
          `Queued Trade: market=${job.marketAddress}, trader=${job.trader}, ` +
            `outcome=${job.outcome}, isBuy=${job.isBuy}, block=${job.blockNumber}`,
        );
      },
    });

    return map;
  }

  // ── WebSocket management ──────────────────────────────────────────────────

  private async connectWebSocket(): Promise<void> {
    const wsUrl = this.indexerCfg.hyperRpcWssUrl;
    try {
      this.provider = new WebSocketProvider(wsUrl);

      this.provider.on('block', (_blockNumber: number) => {
        // Reset backoff on a healthy block event
        this.reconnectDelayMs = 1_000;
        void this.poll();
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.provider.websocket as any).addEventListener?.('close', () => {
        this.logger.warn('HyperSync WS closed — will reconnect…');
        void this.scheduleReconnect();
      });

      this.logger.log(`WS block subscription established: ${wsUrl}`);
    } catch (err) {
      this.logger.error(
        'Failed to open WebSocket connection',
        (err as Error).message,
      );
      void this.scheduleReconnect();
    }
  }

  private async scheduleReconnect(): Promise<void> {
    await this.destroyProvider();
    const delay = Math.min(this.reconnectDelayMs, 30_000);
    this.reconnectDelayMs = Math.min(delay * 2, 30_000);
    this.logger.log(`Reconnecting WS in ${delay}ms…`);
    this.reconnectHandle = setTimeout(
      () => void this.connectWebSocket(),
      delay,
    );
  }

  private async destroyProvider(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.destroy();
      } catch {
        /* ignore */
      }
      this.provider = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Poll skipped — previous run still in progress');
      return;
    }
    this.isRunning = true;
    try {
      await this.runIndexCycle();
    } catch (err) {
      this.logger.error('MarketCreated indexer poll error', err as Error);
    } finally {
      this.isRunning = false;
    }
  }

  private async runIndexCycle(): Promise<void> {
    const cfg = this.indexerCfg;
    const chainId = this.chainCfg.evm.chainId;

    // Static filters — handlers with a known singleton contract address
    const staticFilters: LogFilter[] = [...this.handlers.values()]
      .filter((h) => h.contractAddress)
      .map((h) => ({
        contractAddresses: [h.contractAddress!],
        topic0: h.topic0,
      }));

    // Dynamic Trade filters — one filter covering all known market addresses
    const marketAddresses = await this.cacheService.smembers(
      CACHE_KEY_MARKET_ADDRESSES,
    );
    const tradeFilters: LogFilter[] =
      marketAddresses.length > 0
        ? [{ contractAddresses: marketAddresses, topic0: TRADE_TOPIC0 }]
        : [];

    const filters = [...staticFilters, ...tradeFilters];

    // Determine block range
    const checkpoint = await this.indexerState.getLastBlock(chainId);
    const fromBlock = checkpoint !== null ? checkpoint + 1 : cfg.startBlock;
    const chainHeight = await this.hypersync.getChainHeight();
    const headBlock = chainHeight - cfg.confirmations;

    if (fromBlock > headBlock) {
      this.logger.debug(
        `Indexer up-to-date: fromBlock=${fromBlock}, headBlock=${headBlock}`,
      );
      return;
    }

    this.logger.log(`Indexing events [${fromBlock}–${headBlock}]`);

    let current = fromBlock;
    while (current <= headBlock) {
      const chunkEnd = Math.min(current + cfg.chunkSize - 1, headBlock);

      // One query fetches all tracked event types for this chunk
      const logs = await this.hypersync.getLogsMulti(
        filters,
        current,
        chunkEnd,
      );

      for (const log of logs) {
        const handler = this.handlers.get(log.topic0.toLowerCase());
        if (!handler) continue;
        await handler.handle(log);
      }

      await this.indexerState.setLastBlock(chainId, chunkEnd);
      current = chunkEnd + 1;
    }
  }

  // ── Decoders (one per event type) ─────────────────────────────────────────

  private decodeMarketCreated(log: HyperSyncRawLog): MarketCreatedJob | null {
    try {
      // Indexed: topic1 = matchId (bytes32), topic2 = market (address)
      if (!log.topic1 || !log.topic2) {
        this.logger.warn(
          `MarketCreated log missing indexed topics at tx=${log.transactionHash}`,
        );
        return null;
      }

      const matchId = BigInt(log.topic1).toString();
      const market = `0x${log.topic2.slice(-40)}`;

      // Non-indexed: data = abi.encode(uint8 outcomesCount, uint256 b, uint16 feeBps)
      const coder = AbiCoder.defaultAbiCoder();
      const [outcomesCount, b, feeBps] = coder.decode(
        ['uint8', 'uint256', 'uint16'],
        log.data,
      );

      return {
        matchId,
        market,
        outcomesCount: Number(outcomesCount),
        b: Number(b),
        feeBps: Number(feeBps),
        timestamp: log.timestamp,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      };
    } catch (err) {
      this.logger.error(
        `Failed to decode MarketCreated log at tx=${log.transactionHash}`,
        err as Error,
      );
      return null;
    }
  }

  private decodeTradeLog(log: HyperSyncRawLog): TradeJob | null {
    try {
      // Indexed: topic1 = trader (address), topic2 = outcome (uint8)
      if (!log.topic1 || !log.topic2) {
        this.logger.warn(
          `Trade log missing indexed topics at tx=${log.transactionHash}`,
        );
        return null;
      }

      const trader = `0x${log.topic1.slice(-40)}`;
      const outcome = Number(BigInt(log.topic2));

      // Non-indexed: data = abi.encode(uint256 sharesDelta, uint256 cost, uint256 fee)
      const coder = AbiCoder.defaultAbiCoder();
      const [sharesDelta, cost, fee] = coder.decode(
        ['uint256', 'uint256', 'uint256'],
        log.data,
      );

      // Determine direction from the transaction function selector (first 4 bytes)
      const selector = log.transactionInput?.slice(0, 10).toLowerCase();
      let isBuy: boolean;
      if (selector === BUY_SELECTOR) {
        isBuy = true;
      } else if (selector === SELL_SELECTOR) {
        isBuy = false;
      } else {
        this.logger.warn(
          `Trade log has unrecognised selector "${selector}" at tx=${log.transactionHash} — defaulting to buy`,
        );
        isBuy = true;
      }

      return {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        marketAddress: log.address.toLowerCase(),
        trader: trader.toLowerCase(),
        outcome,
        shares: (sharesDelta as bigint).toString(),
        cost: (cost as bigint).toString(),
        fee: (fee as bigint).toString(),
        isBuy,
        timestamp: log.timestamp,
      };
    } catch (err) {
      this.logger.error(
        `Failed to decode Trade log at tx=${log.transactionHash}`,
        err as Error,
      );
      return null;
    }
  }

  // Add more decoders here as new event types are introduced.
}
