import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  type Provider,
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
} from 'ethers';
import { ChainConfig } from '@config/index';
import { LoggerService } from '@shared/logger/logger.service';
import { ChainServiceRegistry } from '@/modules/chain-services/chain-service-registry';
import {
  CreateMarketParams,
  CreateMarketResult,
  PredictionMarketService,
  ProposeOutcomeParams,
  ProposeOutcomeResult,
} from './prediction-market.service';
import { EvmCryptoService } from '@modules/hypercore-wallets/services';
import { Queue } from 'bullmq';
import { JOBS_QUEUE_NAME } from '../constants/prediction-market-jobs.constants';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-market-jobs.type';
import { abi as MarketFactoryAbi } from '../../../../../contracts/artifacts/contracts/MarketFactory.sol/MarketFactory.json';
import { abi as MatchSettlementAbi } from '../../../../../contracts/artifacts/contracts/MatchSettlement.sol/MatchSettlement.json';

@Injectable()
export class EvmPredictionMarketService
  extends PredictionMarketService
  implements OnModuleInit
{
  constructor(
    @InjectQueue(JOBS_QUEUE_NAME) private readonly queue: Queue,
    private readonly evmCryptoService: EvmCryptoService,
    private readonly configService: ConfigService,
    private readonly registry: ChainServiceRegistry,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  onModuleInit() {
    const chain = this.getChainConfig();
    this.registry.register(PredictionMarketService, chain.current, this);
  }

  async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    const chain = this.getChainConfig();
    const { outcomesCount, bScore, feeBps } = this.resolveMarketParams(
      chain,
      params,
    );

    const matchId = this.toMatchIdBytes32(params.matchId);
    const contract = await this.getMarketFactoryContract(chain);

    const tx = await contract.createMarket(
      matchId,
      outcomesCount,
      bScore,
      feeBps,
    );

    const receipt = await tx.wait();
    const marketAddress = receipt
      ? this.extractMarketAddress(receipt.logs)
      : undefined;

    this.logger.log(
      `Onchain market created for ${params.matchId} tx=${tx.hash}`,
    );

    return { txHash: tx.hash, marketAddress };
  }

  async enqueueCreateMarket(params: CreateMarketJob): Promise<void> {
    const jobId = `prediction-market:create:${params.matchId}`;
    await this.queue.add(PREDICTION_MARKET_JOBS.CREATE_MARKET, params, {
      jobId,
    });
  }

  async enqueueProposeOutcome(params: ProposeOutcomeJob): Promise<void> {
    const jobId = `prediction-market:propose:${params.matchId}`;
    await this.queue.add(PREDICTION_MARKET_JOBS.PROPOSE_OUTCOME, params, {
      jobId,
    });
  }

  async proposeOutcome(
    params: ProposeOutcomeParams,
  ): Promise<ProposeOutcomeResult> {
    const chain = this.getChainConfig();
    const matchId = this.toMatchIdBytes32(params.matchId);
    const contract = await this.getMatchSettlementContract(chain);

    const tx = await contract.proposeOutcome(
      matchId,
      params.outcome,
      params.dataHash,
      params.codeCommitHash,
    );

    this.logger.log(
      `Onchain outcome proposed for ${params.matchId} tx=${tx.hash}`,
    );

    return { txHash: tx.hash };
  }

  private getChainConfig(): ChainConfig {
    const chain = this.configService.get<ChainConfig>('chain');
    if (!chain) {
      throw new Error('Missing chain configuration');
    }
    return chain;
  }

  private resolveMarketParams(chain: ChainConfig, params: CreateMarketParams) {
    return {
      outcomesCount: params.outcomesCount ?? chain.evm.market.outcomesCount,
      bScore: params.bScore ?? chain.evm.market.bScore,
      feeBps: params.feeBps ?? chain.evm.market.feeBps,
    };
  }

  private async getMarketFactoryContract(chain: ChainConfig) {
    const provider = new JsonRpcProvider(chain.evm.rpcUrl);
    return new Contract(
      chain.evm.contracts.marketFactory,
      MarketFactoryAbi,
      await this.getOperatorWallet(provider),
    );
  }

  private async getMatchSettlementContract(chain: ChainConfig) {
    const provider = new JsonRpcProvider(chain.evm.rpcUrl);
    return new Contract(
      chain.evm.contracts.matchSettlement,
      MatchSettlementAbi,
      await this.getOperatorWallet(provider),
    );
  }

  private async getOperatorWallet(rpcProvider: Provider): Promise<Wallet> {
    const operatorKey = await this.evmCryptoService.decryptPrivateKey(
      this.configService.getOrThrow<string>('EVM_OPERATOR_KEY'),
    );
    return new Wallet(operatorKey, rpcProvider);
  }

  private extractMarketAddress(
    logs: Array<{ topics: string[]; data: string }>,
  ) {
    const iface = new Interface(MarketFactoryAbi);
    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'MarketCreated') {
          return parsed.args.market as string;
        }
      } catch {
        continue;
      }
    }
    return undefined;
  }

  private toMatchIdBytes32(matchId: string): string {
    const hex = matchId.replace(/-/g, '');
    if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
      throw new Error(
        `Invalid matchId format: expected UUID-like 32-character hex string, got: ${matchId}`,
      );
    }
    return `0x${hex.padStart(64, '0')}`;
  }
}
