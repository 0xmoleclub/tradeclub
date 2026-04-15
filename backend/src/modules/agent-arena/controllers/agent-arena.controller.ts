import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HybridAuthGuard } from '@/modules/auth/guards/hybrid-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AgentArenaService } from '../services/agent-arena.service';
import { PlaceAgentOrderDto, BuySharesDto } from '../dto';

@ApiTags('Agent Arena')
@Controller('arena')
@UseGuards(HybridAuthGuard)
@ApiBearerAuth()
export class AgentArenaController {
  constructor(private readonly agentArenaService: AgentArenaService) {}

  @Get('battles/active')
  @ApiOperation({ summary: 'Get active battles for the agent' })
  async activeBattles(@CurrentUser('id') userId: string) {
    return this.agentArenaService.getActiveBattles(userId);
  }

  @Get('battles/:battleId/state')
  @ApiOperation({ summary: 'Get full battle state for decision making' })
  async battleState(
    @CurrentUser('id') userId: string,
    @Param('battleId') battleId: string,
  ) {
    return this.agentArenaService.getBattleState(userId, battleId);
  }

  @Post('orders/market')
  @ApiOperation({ summary: 'Place a market order on Hyperliquid' })
  async marketOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceAgentOrderDto,
  ) {
    return this.agentArenaService.placeMarketOrder(userId, dto);
  }

  @Post('orders/limit')
  @ApiOperation({ summary: 'Place a limit order on Hyperliquid' })
  async limitOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceAgentOrderDto,
  ) {
    return this.agentArenaService.placeLimitOrder(userId, dto);
  }

  @Get('markets/:questionId/quote')
  @ApiOperation({ summary: 'Get prediction market buy quote' })
  async quoteBuy(
    @Param('questionId') questionId: string,
    @Query('outcome') outcome: string,
    @Query('shares') shares: string,
  ) {
    return this.agentArenaService.getQuoteBuy(
      questionId,
      parseInt(outcome, 10),
      shares,
    );
  }

  @Post('markets/:questionId/buy')
  @ApiOperation({ summary: 'Buy prediction market shares' })
  async buyShares(
    @CurrentUser('id') userId: string,
    @Param('questionId') questionId: string,
    @Body() dto: BuySharesDto,
  ) {
    return this.agentArenaService.buyShares(userId, questionId, dto);
  }
}
