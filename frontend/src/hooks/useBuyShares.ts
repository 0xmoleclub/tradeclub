"use client";

import { useState, useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import {
  ERC20_ABI,
  PREDICTION_MARKET_ABI,
} from "@/lib/contracts/prediction-market";

export type BuyStatus = "idle" | "approving" | "buying" | "done" | "error";

/**
 * Executes the full client-signed buy flow:
 *   1. Read on-chain USDC allowance.
 *   2. If insufficient, send an ERC-20 `approve` tx and wait for it.
 *   3. Send `PredictionMarket.buy(outcome, sharesWad, maxCost)` and return the hash.
 *
 * @param marketAddress  PredictionMarket contract address (null = market not deployed yet).
 * @param usdcAddress    USDC / stablecoin contract address.
 * @param userAddress    Connected wallet address (null = not connected).
 */
export function useBuyShares(
  marketAddress: string | null | undefined,
  usdcAddress: string | null | undefined,
  userAddress: `0x${string}` | null | undefined,
) {
  const [status, setStatus] = useState<BuyStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const buy = useCallback(
    async (
      outcome: number,
      sharesWad: bigint,
      /** Maximum USDC (6-decimal) the user is willing to spend including fee + slippage. */
      maxCostUsdc: bigint,
    ): Promise<`0x${string}` | null> => {
      if (!marketAddress || !usdcAddress || !userAddress || !publicClient) {
        setError("Wallet not connected or market not yet deployed.");
        return null;
      }

      setError(null);
      setTxHash(null);

      try {
        // ── Step 1: Check existing allowance ──────────────────────────────
        const allowance = await publicClient.readContract({
          address: usdcAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress, marketAddress as `0x${string}`],
        });

        // ── Step 2: Approve if needed ─────────────────────────────────────
        if ((allowance as bigint) < maxCostUsdc) {
          setStatus("approving");
          const approveTxHash = await writeContractAsync({
            address: usdcAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [marketAddress as `0x${string}`, maxCostUsdc],
          });
          // Wait for the approval to be mined before buying
          await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        }

        // ── Step 3: Buy shares ────────────────────────────────────────────
        setStatus("buying");
        const buyTxHash = await writeContractAsync({
          address: marketAddress as `0x${string}`,
          abi: PREDICTION_MARKET_ABI,
          functionName: "buy",
          args: [outcome, sharesWad, maxCostUsdc],
        });

        setTxHash(buyTxHash);
        setStatus("done");
        return buyTxHash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [marketAddress, usdcAddress, userAddress, publicClient, writeContractAsync],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
  }, []);

  const isPending = status === "approving" || status === "buying";

  return { buy, reset, status, isPending, txHash, error };
}
