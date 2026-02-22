import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { LoggerService } from '@shared/logger/logger.service';
import { CONTRACT_CALL_QUEUE } from '../constants/queues.constants';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-job.type';
import { PredictionMarketContractService } from '../services/prediction-market-contract.service';

@Processor(CONTRACT_CALL_QUEUE)
export class PredictionContractProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly contractService: PredictionMarketContractService,
  ) {
    super();
  }

  async process(job: Job<CreateMarketJob | ProposeOutcomeJob>) {
    switch (job.name) {
      case PREDICTION_MARKET_JOBS.CREATE_MARKET:
        await this.handleCreateMarket(job as Job<CreateMarketJob>);
        return;
      case PREDICTION_MARKET_JOBS.PROPOSE_OUTCOME:
        await this.handleProposeOutcome(job as Job<ProposeOutcomeJob>);
        return;
      default:
        this.logger.warn(
          `Unhandled prediction market job: ${job.name} (job ${job.id})`,
        );
    }
  }

  private async handleCreateMarket(job: Job<CreateMarketJob>) {
    const { battleId } = job.data;
    const result = await this.contractService.createMarket({ matchId: battleId }); // TODO: Using offchain battleId as onchain matchId for now, should refactor

    await this.updateMetadata(battleId, {
      onchain: {
        marketAddress: result.marketAddress,
        marketTxHash: result.txHash,
      },
    });

    this.logger.log(`Onchain market created for ${battleId} (job ${job.id})`);
  }

  private async handleProposeOutcome(job: Job<ProposeOutcomeJob>) {
    const { battleId, matchId, outcome, dataHash, codeCommitHash } = job.data;
    const result = await this.contractService.proposeOutcome({
      matchId,
      outcome,
      dataHash,
      codeCommitHash,
    });

    await this.updateMetadata(battleId, {
      onchain: { outcomeTxHash: result.txHash },
    });

    this.logger.log(`Onchain outcome proposed for ${matchId} (job ${job.id})`);
  }

  private async updateMetadata(
    battleId: string,
    patch: Prisma.InputJsonObject,
  ) {
    const current = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: { metadata: true },
    });

    const currentMetadata =
      (current?.metadata as Prisma.JsonObject | null) ?? {};
    const mergedOnchain =
      currentMetadata.onchain && patch.onchain
        ? {
            ...(currentMetadata.onchain as Prisma.InputJsonObject),
            ...(patch.onchain as Prisma.InputJsonObject),
          }
        : undefined;

    const next: Prisma.InputJsonObject = {
      ...(currentMetadata as Prisma.InputJsonObject),
      ...patch,
      ...(mergedOnchain ? { onchain: mergedOnchain } : {}),
    };

    await this.prisma.battle.update({
      where: { id: battleId },
      data: { metadata: next as Prisma.InputJsonValue },
    });
  }
}
