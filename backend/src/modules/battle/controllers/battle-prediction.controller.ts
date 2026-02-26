import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PredictionMarketService } from '@modules/prediction-market/services/prediction-market.service';
import {
  BattleMarketsResponseDto,
  UserPositionResponseDto,
} from '../dto/battle-prediction.dto';

/**
 * Battle prediction market endpoints.
 * All routes are read-only and public (no auth required) so the match page
 * can display live odds and user positions without a login gate.
 */
@ApiTags('Battle Prediction Market')
@Controller('battle/:battleId/markets')
export class BattlePredictionController {
  constructor(private readonly predictionMarket: PredictionMarketService) {}

  /**
   * GET /battle/:battleId/markets
   *
   * Returns all prediction questions for the battle, each with:
   * - LMSR spot prices per outcome
   * - Total volume and shares outstanding
   * - Market status (PENDING | ACTIVE | RESOLVED) and resolved outcome if set
   */
  @Get()
  @ApiOperation({ summary: 'Get all prediction markets for a battle' })
  async getMarkets(
    @Param('battleId') battleId: string,
  ): Promise<BattleMarketsResponseDto> {
    return this.predictionMarket.getMarketsByBattle(battleId);
  }

  /**
   * GET /battle/:battleId/markets/:questionId/position?walletAddress=0x...
   *
   * Returns the net position of a wallet address for one prediction question:
   * - netShares: total shares held (BUY − SELL)
   * - avgEntryPrice: average USD cost per share (buys only)
   * - totalCostUsd: total USD spent on BUY trades
   *
   * NOTE: per-outcome breakdown will be added in Phase 2 once BattlePredictionTrade
   * gains an `outcome` column.
   */
  @Get(':questionId/position')
  @ApiOperation({
    summary: "Get a wallet's position for one prediction question",
  })
  @ApiQuery({ name: 'walletAddress', required: true })
  async getUserPosition(
    @Param('questionId') questionId: string,
    @Query('walletAddress') walletAddress: string,
  ): Promise<UserPositionResponseDto> {
    return this.predictionMarket.getUserPosition(questionId, walletAddress);
  }
}
