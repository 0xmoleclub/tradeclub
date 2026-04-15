// Set minimal env vars so ConfigModule validation passes in e2e tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/tradeclub_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'a'.repeat(64);
process.env.HYPERLIQUID_RPC_URL = process.env.HYPERLIQUID_RPC_URL || 'https://api.hyperliquid-testnet.xyz';
process.env.EVM_OPERATOR_KEY = process.env.EVM_OPERATOR_KEY || '0x' + '1'.repeat(64);
process.env.EVM_MARKET_FACTORY = process.env.EVM_MARKET_FACTORY || '0x1111111111111111111111111111111111111111';
process.env.EVM_MATCH_SETTLEMENT = process.env.EVM_MATCH_SETTLEMENT || '0x2222222222222222222222222222222222222222';
process.env.EVM_STABLECOIN = process.env.EVM_STABLECOIN || '0x3333333333333333333333333333333333333333';
process.env.EVM_FEE_COLLECTOR = process.env.EVM_FEE_COLLECTOR || '0x4444444444444444444444444444444444444444';
