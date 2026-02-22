import Joi from 'joi';

export const workerEnvSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('debug'),
  LOG_DIR: Joi.string().default('logs'),

  DATABASE_URL: Joi.string().uri().required(),

  WALLET_ENCRYPTION_KEY: Joi.string().min(32).required(),
  WALLET_ENCRYPTION_KEY_SALT: Joi.string().optional(),

  CHAIN_CURRENT: Joi.string()
    .valid('evm-local', 'arbitrum-mainnet', 'arbitrum-sepolia')
    .default('evm-local'),
  EVM_CHAIN_ID: Joi.number().integer().positive().default(1),
  EVM_RPC_URL: Joi.string().uri().required(),
  EVM_OPERATOR_KEY: Joi.string().required(),
  EVM_MARKET_FACTORY: Joi.string().required(),
  EVM_MATCH_SETTLEMENT: Joi.string().required(),
  EVM_STABLECOIN: Joi.string().required(),
  EVM_FEE_COLLECTOR: Joi.string().required(),
  EVM_OUTCOMES_COUNT: Joi.number().integer().min(2).default(2),
  EVM_B_SCORE: Joi.string().default('1000000000000000000'),
  EVM_FEE_BPS: Joi.number().integer().min(0).default(200),

  REDIS_URL: Joi.string().uri().allow('').optional(),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),

  MORALIS_API_KEY: Joi.string().optional(),
  MORALIS_STREAM_ID: Joi.string().optional(),
  MORALIS_WEBHOOK_SECRET: Joi.string().optional(),
  MORALIS_STREAMS_BASE_URL: Joi.string().uri().optional(),

  ENVIO_API_TOKEN: Joi.string().allow('').optional(),
  INDEXER_HYPERSYNC_URL: Joi.string().uri().optional(),
  INDEXER_HYPERRPC_URL: Joi.string().uri().optional(),
  INDEXER_HYPERRPC_WSS_URL: Joi.string().optional(),
  INDEXER_FALLBACK_POLL_INTERVAL_MS: Joi.number()
    .integer()
    .min(5000)
    .default(30000),
  INDEXER_START_BLOCK: Joi.number().integer().min(0).default(0),
  INDEXER_CONFIRMATIONS: Joi.number().integer().min(0).default(10),
  INDEXER_CHUNK_SIZE: Joi.number().integer().min(100).max(10000).default(2000),

  TEST_EVM_PRIVATE_KEY: Joi.string().optional(),
  TEST_EVM_ADDRESS: Joi.string().optional(),
}).unknown(true);
