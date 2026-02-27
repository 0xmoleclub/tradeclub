import { useQuery } from "@tanstack/react-query";
import {
  fetchChainInfo,
  type ChainInfoResponse,
} from "@/lib/api/prediction-market";

/**
 * Fetches the onchain contract config for a specific prediction question.
 * Result is cached indefinitely (chainId and USDC address are immutable).
 */
export function useChainInfo(
  battleId: string | null | undefined,
  questionId: string | null | undefined,
) {
  return useQuery<ChainInfoResponse>({
    queryKey: ["chain-info", battleId, questionId],
    queryFn: () => fetchChainInfo(battleId!, questionId!),
    enabled: !!battleId && !!questionId,
    staleTime: Infinity,
  });
}
