import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndexerConfig } from '@config/indexer.config';
import { LoggerService } from '@shared/logger/logger.service';

export interface HyperSyncRawLog {
  blockNumber: number;
  address: string;
  topic0: string;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string;
  transactionHash: string;
  logIndex: number;
  timestamp: number; // block timestamp, injected after query
  /** Raw hex input of the transaction that emitted this log (0x-prefixed). */
  transactionInput?: string;
}

interface HyperSyncApiLog {
  block_number: number;
  address: string;
  topic0: string;
  topic1?: string | null;
  topic2?: string | null;
  topic3?: string | null;
  data: string;
  transaction_hash: string;
  log_index: number;
}

interface HyperSyncApiBlock {
  number: number;
  timestamp: number;
}

interface HyperSyncApiTransaction {
  hash: string;
  input: string;
}

interface HyperSyncQueryResponse {
  archive_height: number | null;
  next_block: number;
  data: {
    logs?: HyperSyncApiLog[];
    blocks?: HyperSyncApiBlock[];
    transactions?: HyperSyncApiTransaction[];
  };
}

type HyperSyncHeightResponse = { height: number };

/** A single (contract-set, topic0) pair passed to a multi-event query. */
export interface LogFilter {
  /** One or more emitting contract addresses (OR-ed by HyperSync). */
  contractAddresses: string[];
  topic0: string;
}

@Injectable()
export class HypersyncService {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const cfg = this.configService.get<IndexerConfig>('indexer')!;
    this.baseUrl = cfg.hypersyncUrl.replace(/\/$/, '');
    this.apiToken = cfg.apiToken;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiToken) h['Authorization'] = `Bearer ${this.apiToken}`;
    return h;
  }

  /**
   * Fetches the current chain height from HyperSync.
   */
  async getChainHeight(): Promise<number> {
    const resp = await fetch(`${this.baseUrl}/height`, {
      headers: this.headers,
    });
    if (!resp.ok) {
      throw new Error(
        `HyperSync /height failed: ${resp.status} ${resp.statusText}`,
      );
    }
    const body = (await resp.json()) as HyperSyncHeightResponse;
    return body.height;
  }

  /**
   * Fetches event logs from HyperSync for a specific contract address and topic0
   * within [fromBlock, toBlock].
   */
  async getLogs(
    contractAddress: string,
    topic0: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<HyperSyncRawLog[]> {
    const query = {
      from_block: fromBlock,
      to_block: toBlock + 1, // HyperSync is exclusive on to_block
      logs: [
        {
          address: [contractAddress.toLowerCase()],
          topics: [[topic0]],
        },
      ],
      field_selection: {
        log: [
          'block_number',
          'address',
          'topic0',
          'topic1',
          'topic2',
          'topic3',
          'data',
          'transaction_hash',
          'log_index',
        ],
        block: ['number', 'timestamp'],
      },
    };

    const resp = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(
        `HyperSync /query failed: ${resp.status} ${resp.statusText} — ${errText}`,
      );
    }

    const body = (await resp.json()) as HyperSyncQueryResponse;
    const rawLogs = body.data.logs ?? [];
    const rawBlocks = body.data.blocks ?? [];

    // Build block number → timestamp lookup
    const blockTimestamps = new Map<number, number>(
      rawBlocks.map((b) => [b.number, b.timestamp]),
    );

    const logs: HyperSyncRawLog[] = rawLogs.map((l) => ({
      blockNumber: l.block_number,
      address: l.address,
      topic0: l.topic0,
      topic1: l.topic1 ?? null,
      topic2: l.topic2 ?? null,
      topic3: l.topic3 ?? null,
      data: l.data,
      transactionHash: l.transaction_hash,
      logIndex: l.log_index,
      timestamp: blockTimestamps.get(l.block_number) ?? 0,
    }));

    this.logger.debug(
      `HyperSync: [${fromBlock}-${toBlock}] → ${logs.length} logs, ` +
        `nextBlock=${body.next_block}, archiveHeight=${body.archive_height ?? 'N/A'}`,
    );

    return logs;
  }

  /**
   * Fetches logs for multiple (contract, topic0) filters in a single HyperSync
   * query. Use this when indexing several event types at once to avoid redundant
   * round-trips.
   */
  async getLogsMulti(
    filters: LogFilter[],
    fromBlock: number,
    toBlock: number,
  ): Promise<HyperSyncRawLog[]> {
    if (filters.length === 0) return [];

    const query = {
      from_block: fromBlock,
      to_block: toBlock + 1,
      logs: filters.map((f) => ({
        address: f.contractAddresses.map((a) => a.toLowerCase()),
        topics: [[f.topic0]],
      })),
      field_selection: {
        log: [
          'block_number',
          'address',
          'topic0',
          'topic1',
          'topic2',
          'topic3',
          'data',
          'transaction_hash',
          'log_index',
        ],
        block: ['number', 'timestamp'],
        // Fetch tx input so handlers can read the function selector (e.g. buy vs sell)
        transaction: ['hash', 'input'],
      },
    };

    const resp = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(
        `HyperSync /query (multi) failed: ${resp.status} ${resp.statusText} — ${errText}`,
      );
    }

    const body = (await resp.json()) as HyperSyncQueryResponse;
    const rawLogs = body.data.logs ?? [];
    const rawBlocks = body.data.blocks ?? [];
    const rawTxs = body.data.transactions ?? [];

    const blockTimestamps = new Map<number, number>(
      rawBlocks.map((b) => [b.number, b.timestamp]),
    );
    const txInputs = new Map<string, string>(
      rawTxs.map((tx) => [tx.hash.toLowerCase(), tx.input]),
    );

    const logs: HyperSyncRawLog[] = rawLogs.map((l) => ({
      blockNumber: l.block_number,
      address: l.address,
      topic0: l.topic0,
      topic1: l.topic1 ?? null,
      topic2: l.topic2 ?? null,
      topic3: l.topic3 ?? null,
      data: l.data,
      transactionHash: l.transaction_hash,
      logIndex: l.log_index,
      timestamp: blockTimestamps.get(l.block_number) ?? 0,
      transactionInput: txInputs.get(l.transaction_hash.toLowerCase()),
    }));

    this.logger.debug(
      `HyperSync multi: [${fromBlock}-${toBlock}] ${filters.length} filter(s) → ${logs.length} logs`,
    );

    return logs;
  }
}
