import { useQuery } from "@tanstack/react-query";
import {
  fetchMarkets,
  type BattleMarketsResponse,
} from "@/lib/api/prediction-market";

/**
 * Fetches all prediction markets for a battle and keeps them fresh.
 * Polls every 15 seconds so spot prices and volumes stay up to date.
 */
export function usePredictionMarkets(battleId: string | null | undefined) {
  return useQuery<BattleMarketsResponse>({
    queryKey: ["prediction-markets", battleId],
    queryFn: () => fetchMarkets(battleId!),
    enabled: !!battleId,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}
