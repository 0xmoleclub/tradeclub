import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type Provider,
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
} from 'ethers';
import { Prisma } from '@prisma/client';
import { ChainConfig } from '@config/chain.config';
import { EvmCryptoService } from '@modules/hypercore-wallets/services/evm-crypto.service';
import {
  CreateMarketParams,
  CreateMarketResult,
  ProposeOutcomeParams,
  ProposeOutcomeResult,
} from '../types/prediction-contract.type';
import { abi as MarketFactoryAbi } from '../../../../../contracts/artifacts/contracts/MarketFactory.sol/MarketFactory.json';
import { abi as MatchSettlementAbi } from '../../../../../contracts/artifacts/contracts/MatchSettlement.sol/MatchSettlement.json';

const PREDICTION_MARKET_ABI = [
  'function quoteBuy(uint8 outcome, uint256 amountShares) external view returns (uint256 costUsdc, uint256 feeUsdc)',
];

const USDC_DECIMALS = new Prisma.Decimal(1_000_000);

@Injectable()
export class PredictionContractService {
  private readonly provider: JsonRpcProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly evmCryptoService: EvmCryptoService,
  ) {
    this.provider = new JsonRpcProvider(this.chainConfig.evm.rpcUrl);
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  /**
   * Returns the USD price per share for a given outcome at the specified block.
   *
   * Calls `quoteBuy(outcome, 1)` — the USDC cost (6 decimals) of buying exactly
   * 1 share — so no offchain WAD conversion is needed.
   */
  async getOutcomePrice(
    marketAddress: string,
    outcome: number,
    blockNumber?: number,
  ): Promise<Prisma.Decimal> {
    const contract = new Contract(
      marketAddress,
      PREDICTION_MARKET_ABI,
      this.provider,
    );
    const [costUsdc]: [bigint, bigint] = await contract.quoteBuy(
      outcome,
      BigInt(1e18), // 1 share in WAD (1e18)
      blockNumber ? { blockTag: blockNumber } : {},
    );
    return new Prisma.Decimal(costUsdc.toString()).div(USDC_DECIMALS);
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    const chain = this.chainConfig;
    const { outcomesCount, bScore, feeBps } = this.resolveMarketParams(
      chain,
      params,
    );
    const matchId = this.uuidToBytes16(params.matchId);
    const questionId = this.uuidToBytes16(params.questionId);
    const contract = await this.getMarketFactoryContract(chain);

    const tx = await contract.createMarket(
      matchId,
      questionId,
      outcomesCount,
      bScore,
      feeBps,
    );
    const receipt = await tx.wait();
    const marketAddress = receipt
      ? this.extractMarketAddress(receipt.logs)
      : undefined;

    return { txHash: tx.hash, marketAddress };
  }

  async proposeOutcome(
    params: ProposeOutcomeParams,
  ): Promise<ProposeOutcomeResult> {
    const chain = this.chainConfig;
    const matchId = this.uuidToBytes16(params.matchId);
    const contract = await this.getMatchSettlementContract(chain);

    const tx = await contract.proposeOutcome(
      matchId,
      params.outcome,
      params.dataHash,
      params.codeCommitHash,
    );

    return { txHash: tx.hash };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private get chainConfig(): ChainConfig {
    return this.configService.getOrThrow<ChainConfig>('chain');
  }

  private async getMarketFactoryContract(chain: ChainConfig) {
    return new Contract(
      chain.evm.contracts.marketFactory,
      MarketFactoryAbi,
      await this.getOperatorWallet(),
    );
  }

  private async getMatchSettlementContract(chain: ChainConfig) {
    return new Contract(
      chain.evm.contracts.matchSettlement,
      MatchSettlementAbi,
      await this.getOperatorWallet(),
    );
  }

  private async getOperatorWallet(provider?: Provider): Promise<Wallet> {
    const raw = this.configService.getOrThrow<string>('EVM_OPERATOR_KEY');
    // A raw private key is 0x-prefixed 64-char hex; the encrypted format is
    // "ivBase64:authTagBase64:ciphertextBase64" (contains colons, no 0x).
    const isRawKey = /^0x[0-9a-fA-F]{64}$/.test(raw);
    const privateKey = isRawKey
      ? (raw as `0x${string}`)
      : await this.evmCryptoService.decryptPrivateKey(raw);
    return new Wallet(privateKey, provider ?? this.provider);
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

  uuidToBytes16(matchId: string): string {
    // Accept UUIDs with or without dashes and optional 0x prefix.
    let hex = matchId;
    if (hex.startsWith('0x') || hex.startsWith('0X')) {
      hex = hex.slice(2);
    }
    // Remove any dashes that may be present in Prisma UUIDs.
    hex = hex.replace(/-/g, '');
    if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
      throw new Error(
        `Invalid matchId format: expected UUID-like 32-character hex string (with optional dashes or 0x prefix), got: ${matchId}`,
      );
    }
    return `0x${hex}`;
  }

  private resolveMarketParams(chain: ChainConfig, params: CreateMarketParams) {
    return {
      outcomesCount: params.outcomesCount ?? chain.evm.market.outcomesCount,
      bScore: params.bScore ?? chain.evm.market.bScore,
      feeBps: params.feeBps ?? chain.evm.market.feeBps,
    };
  }
}
