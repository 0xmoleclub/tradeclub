/**
 * @description Data Transfer Objects for HyperSync API interactions.
 */
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
  /** HyperSync returns timestamps as hex strings (e.g. "0x699b58b3") */
  timestamp: number | string;
}

interface HyperSyncApiTransaction {
  hash: string;
  input: string;
}

interface HyperSyncQueryPage {
  logs?: HyperSyncApiLog[];
  blocks?: HyperSyncApiBlock[];
  transactions?: HyperSyncApiTransaction[];
}

/**
 * HyperSync /query response shape.
 * `data` is an array of pages; each page carries its own logs/blocks/transactions.
 */
export interface HyperSyncQueryResponse {
  archive_height: number | null;
  next_block: number;
  data: HyperSyncQueryPage[];
}

/**
 * HyperSync /height response shape.
 */
export interface HyperSyncHeightResponse {
  height: number;
}
