import Joi from 'joi';

export const appEnvSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3002),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),
  CORS_ORIGIN: Joi.string().default('*'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('debug'),
  LOG_DIR: Joi.string().default('logs'),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('1d'),

  WALLET_ENCRYPTION_KEY: Joi.string().min(32).required(),
  WALLET_ENCRYPTION_KEY_SALT: Joi.string().default('salt'),

  HYPERLIQUID_NETWORK: Joi.string()
    .valid('testnet', 'mainnet')
    .default('testnet'),
  HYPERLIQUID_RPC_URL: Joi.string().uri().required(),

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

  THROTTLE_TTL: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),

  MORALIS_API_KEY: Joi.string().required(),
  MORALIS_STREAM_ID: Joi.string().required(),
  MORALIS_WEBHOOK_SECRET: Joi.string().required(),
  MORALIS_STREAMS_BASE_URL: Joi.string()
    .uri()
    .default('https://api.moralis.io'),

  TEST_EVM_PRIVATE_KEY: Joi.string().optional(),
  TEST_EVM_ADDRESS: Joi.string().optional(),
}).unknown(true);
