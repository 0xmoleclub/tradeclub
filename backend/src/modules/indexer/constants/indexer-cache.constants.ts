/** Redis set of all known prediction market contract addresses. */
export const CACHE_KEY_MARKET_ADDRESSES =
  'prediction-market:contract-addresses';

/** Redis key storing the battleId for a given market contract address. */
export const cacheKeyMarketBattleId = (marketAddress: string) =>
  `prediction-market:market:${marketAddress}:battleId`;
