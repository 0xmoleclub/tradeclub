import { useReadContract } from "wagmi";
import { PREDICTION_MARKET_ABI } from "@/lib/contracts/prediction-market";

/**
 * Reads the on-chain quoteBuy for a given outcome and share amount.
 *
 * Returns `[costUsdc, feeUsdc]` — both in USDC 6-decimal units.
 * Divide by 1e6 to display as dollar amounts.
 *
 * @param marketAddress  Contract address, or null if market not yet deployed.
 * @param outcome        Outcome index (0, 1, …)
 * @param sharesWad      Shares in WAD (1e18 = 1 share). Set to 0n to disable.
 */
export function useQuoteBuy(
  marketAddress: string | null | undefined,
  outcome: number,
  sharesWad: bigint,
) {
  return useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: "quoteBuy",
    args: [outcome, sharesWad],
    query: {
      enabled: !!marketAddress && sharesWad > 0n,
      // Refresh quote every 10 s to reflect price movement
      refetchInterval: 10_000,
      staleTime: 5_000,
    },
  });
}
