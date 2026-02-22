import { registerAs } from '@nestjs/config';

export interface IndexerConfig {
  hypersyncUrl: string;
  hyperRpcUrl: string;
  /** WebSocket RPC endpoint for real-time block subscriptions */
  hyperRpcWssUrl: string;
  apiToken: string;
  /** How often to poll as a WS fallback (ms) */
  fallbackPollIntervalMs: number;
  startBlock: number;
  confirmations: number;
  chunkSize: number;
}

export const indexerConfig = registerAs(
  'indexer',
  (): IndexerConfig => ({
    hypersyncUrl:
      process.env.INDEXER_HYPERSYNC_URL ||
      'https://arbitrum-sepolia.hypersync.xyz',
    hyperRpcUrl:
      process.env.INDEXER_HYPERRPC_URL ||
      'https://arbitrum-sepolia.rpc.hypersync.xyz',
    hyperRpcWssUrl:
      process.env.INDEXER_HYPERRPC_WSS_URL ||
      'wss://arbitrum-sepolia.rpc.hypersync.xyz',
    apiToken: process.env.ENVIO_API_TOKEN || '',
    fallbackPollIntervalMs: parseInt(
      process.env.INDEXER_FALLBACK_POLL_INTERVAL_MS || '30000',
      10,
    ),
    startBlock: parseInt(process.env.INDEXER_START_BLOCK || '0', 10),
    confirmations: parseInt(process.env.INDEXER_CONFIRMATIONS || '10', 10),
    chunkSize: parseInt(process.env.INDEXER_CHUNK_SIZE || '2000', 10),
  }),
);
