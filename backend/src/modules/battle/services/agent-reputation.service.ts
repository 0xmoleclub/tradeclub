import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { PrismaService } from '@/database/prisma.service';
import { ChainConfig } from '@config/chain.config';
import { EvmCryptoService } from '@modules/hypercore-wallets/services/evm-crypto.service';
import { UserType } from '@prisma/client';

const REPUTATION_REGISTRY_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external',
];

interface ReputationEntry {
  tag1: string;
  tag2?: string;
  value: number;
  valueDecimals: number;
}

@Injectable()
export class AgentReputationService {
  private readonly logger = new Logger(AgentReputationService.name);
  private readonly provider: JsonRpcProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly evmCryptoService: EvmCryptoService,
  ) {
    this.provider = new JsonRpcProvider(this.chainConfig.evm.rpcUrl);
  }

  async submitBattleReputation(
    battleId: string,
    metrics: { playerSlot: number; metric: string; value: string }[],
  ): Promise<void> {
    const chain = this.chainConfig;
    if (!chain.evm.contracts.reputationRegistry) {
      this.logger.warn('Reputation registry not configured, skipping');
      return;
    }

    const players = await this.prisma.battlePlayer.findMany({
      where: { battleId },
      include: {
        user: {
          include: {
            agentProfile: true,
          },
        },
      },
    });

    const reputationContract = await this.getReputationContract(chain);

    for (const player of players) {
      if (player.user.type !== UserType.AGENT || !player.user.agentProfile) {
        continue;
      }

      const profile = player.user.agentProfile;
      const agentNumericId = this.parseAgentId(profile.agentId);
      if (agentNumericId === null) {
        this.logger.warn(`Invalid agentId ${profile.agentId}, skipping reputation`);
        continue;
      }

      const playerMetrics = metrics.filter((m) => m.playerSlot === player.slot);
      const entries = this.buildReputationEntries(playerMetrics, player.eloSnapshot);

      for (const entry of entries) {
        try {
          const tx = await reputationContract.giveFeedback(
            agentNumericId,
            entry.value,
            entry.valueDecimals,
            entry.tag1,
            entry.tag2 || '',
            '', // endpoint
            '', // feedbackURI
            '0x0000000000000000000000000000000000000000000000000000000000000000', // feedbackHash
          );
          await tx.wait();
          this.logger.log(
            `Reputation submitted for agent ${profile.agentId}: ${entry.tag1}=${entry.value}`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to submit reputation for agent ${profile.agentId}`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      // Update last reputation timestamp
      await this.prisma.agentProfile.update({
        where: { id: profile.id },
        data: { lastReputationUpdate: new Date() },
      });
    }
  }

  private buildReputationEntries(
    metrics: { metric: string; value: string }[],
    eloSnapshot: number,
  ): ReputationEntry[] {
    const entries: ReputationEntry[] = [];

    for (const m of metrics) {
      const val = parseFloat(m.value);
      if (Number.isNaN(val)) continue;

      if (m.metric === 'PNL') {
        entries.push({ tag1: 'tradingYield', tag2: 'battle', value: Math.floor(val * 100), valueDecimals: 2 });
      }
      if (m.metric === 'ROI') {
        entries.push({ tag1: 'tradingYield', tag2: 'roi', value: Math.floor(val * 100), valueDecimals: 2 });
      }
      if (m.metric === 'WIN_RATE') {
        entries.push({ tag1: 'winRate', value: Math.floor(val * 100), valueDecimals: 2 });
      }
    }

    // Always push ELO as a reputation signal
    entries.push({ tag1: 'elo', value: eloSnapshot, valueDecimals: 0 });

    return entries;
  }

  private parseAgentId(agentId: string): bigint | null {
    // Expect format: agent-{hex} or plain numeric string
    const clean = agentId.replace(/^agent-/, '');
    if (/^[0-9]+$/.test(clean)) return BigInt(clean);
    // If hex, convert to bigint
    if (/^[0-9a-fA-F]+$/.test(clean)) {
      try {
        return BigInt(`0x${clean}`);
      } catch {
        return null;
      }
    }
    return null;
  }

  private async getReputationContract(chain: ChainConfig) {
    return new Contract(
      chain.evm.contracts.reputationRegistry,
      REPUTATION_REGISTRY_ABI,
      await this.getOperatorWallet(),
    );
  }

  private async getOperatorWallet(): Promise<Wallet> {
    const raw = this.configService.getOrThrow<string>('EVM_OPERATOR_KEY');
    const isRawKey = /^0x[0-9a-fA-F]{64}$/.test(raw);
    const privateKey = isRawKey
      ? (raw as `0x${string}`)
      : await this.evmCryptoService.decryptPrivateKey(raw);
    return new Wallet(privateKey, this.provider);
  }

  private get chainConfig(): ChainConfig {
    return this.configService.getOrThrow<ChainConfig>('chain');
  }
}
