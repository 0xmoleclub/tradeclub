import { registerAs } from '@nestjs/config';

export type ChainKey = 'evm-local' | 'arbitrum-mainnet' | 'arbitrum-sepolia';

export interface ChainConfig {
  current: ChainKey;
  evm: {
    chainId: number;
    rpcUrl: string;
    operatorKey: string;
    contracts: {
      marketFactory: string;
      matchSettlement: string;
      stablecoin: string;
      feeCollector: string;
      identityRegistry: string;
      reputationRegistry: string;
      validationRegistry: string;
    };
    market: {
      outcomesCount: number;
      bScore: string;
      feeBps: number;
    };
  };
}

export const chainConfig = registerAs(
  'chain',
  (): ChainConfig => ({
    current: (process.env.CHAIN_CURRENT as ChainKey) || 'evm-local',
    evm: {
      chainId: parseInt(process.env.EVM_CHAIN_ID || '1', 10),
      rpcUrl:
        process.env.EVM_RPC_URL ||
        'https://arbitrum-sepolia-testnet.api.pocket.network',
      operatorKey: process.env.EVM_OPERATOR_KEY!,
      contracts: {
        marketFactory: process.env.EVM_MARKET_FACTORY!,
        matchSettlement: process.env.EVM_MATCH_SETTLEMENT!,
        stablecoin: process.env.EVM_STABLECOIN!,
        feeCollector: process.env.EVM_FEE_COLLECTOR!,
        identityRegistry: process.env.EVM_IDENTITY_REGISTRY || '',
        reputationRegistry: process.env.EVM_REPUTATION_REGISTRY || '',
        validationRegistry: process.env.EVM_VALIDATION_REGISTRY || '',
      },
      market: {
        outcomesCount: parseInt(process.env.EVM_OUTCOMES_COUNT || '2', 10),
        bScore: process.env.EVM_B_SCORE || '1000000000000000000',
        feeBps: parseInt(process.env.EVM_FEE_BPS || '200', 10),
      },
    },
  }),
);
