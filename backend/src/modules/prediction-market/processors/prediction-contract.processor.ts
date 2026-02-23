import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { Logger } from '@nestjs/common';
import { CONTRACT_CALL_QUEUE } from '../constants/queues.constants';
import {
  CreateMarketJob,
  PREDICTION_MARKET_JOBS,
  ProposeOutcomeJob,
} from '../types/prediction-job.type';
import { PredictionContractService } from '../services/prediction-contract.service';

@Processor(CONTRACT_CALL_QUEUE)
export class PredictionContractProcessor extends WorkerHost {
  private readonly logger = new Logger(PredictionContractProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractService: PredictionContractService,
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
    this.logger.verbose('calling handleCreateMarket');
    const { battleId, questionId } = job.data;
    try {
      const result = await this.contractService.createMarket({
        matchId: battleId,
        questionId, // TODO: Using offchain battleId as onchain questionId for now, should refactor
      });
      this.logger.log(`CreateMarket result: ${JSON.stringify(result)}`);
      await this.updateMetadata(battleId, questionId, {
        onchain: {
          marketAddress: result.marketAddress,
          marketTxHash: result.txHash,
        },
      });
    } catch (err) {
      this.logger.error(
        `Error in handleCreateMarket for battle ${battleId}: ${err}`,
      );
      throw err;
    }

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

    await this.updateMetadata(battleId, job.data.questionId, {
      onchain: { outcomeTxHash: result.txHash },
    });

    this.logger.log(`Onchain outcome proposed for ${matchId} (job ${job.id})`);
  }

  private async updateMetadata(
    battleId: string,
    questionId: string,
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

    await this.prisma.$transaction(async (tx) => {
      await tx.battle.update({
        where: { id: battleId },
        data: { metadata: next as Prisma.InputJsonValue },
      });
      const marketAddress = (patch.onchain as any)?.marketAddress;
      if (marketAddress) {
        await tx.battlePredictionQuestion.update({
          where: { battleId, id: questionId },
          data: {
            marketAddress: (patch.onchain as any)?.marketAddress,
          },
        });
      }
    });
  }
}
