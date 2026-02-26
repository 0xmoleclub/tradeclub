import { Controller, Get, Param, Query } from '@nestjs/common';
import { PredictionMarketService } from './services/prediction-market.service';
import { OrderbookResponse } from './types/prediction-market.type';

@Controller('prediction-market')
export class PredictionMarketController {
  constructor(private readonly service: PredictionMarketService) {}

  /**
   * GET /prediction-market/:marketAddress/orderbook?levels=20&step=0.01
   *
   * Returns a synthetic LMSR orderbook for the given market.
   * No auth required (read-only, public data).
   */
  @Get(':marketAddress/orderbook')
  async getOrderbook(
    @Param('marketAddress') marketAddress: string,
    @Query('levels') levels?: string,
    @Query('step') step?: string,
  ): Promise<OrderbookResponse> {
    const nLevels = levels
      ? Math.min(Math.max(parseInt(levels, 10), 1), 50)
      : 20;
    const stepNum = step
      ? Math.min(Math.max(parseFloat(step), 0.001), 0.1)
      : 0.01;
    return this.service.getOrderbook(marketAddress, nLevels, stepNum);
  }
}
