# Wagmi/Viem Patterns

## Files

- `frontend/src/hooks/useBuyShares.ts`
- `frontend/src/hooks/useQuoteBuy.ts`
- `frontend/src/lib/contracts/prediction-market.ts`
- `frontend/src/components/wallet/WalletProvider.tsx`

## Hook Structure

Follow the `useBuyShares` state machine pattern:

```ts
"use client";
import { useState, useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";

export function useMyContract(address?: string) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const act = useCallback(async (args: any) => {
    if (!address || !publicClient) return null;
    setStatus("pending");
    try {
      const hash = await writeContractAsync({
        address: address as `0x${string}`,
        abi: MY_ABI,
        functionName: "myFunc",
        args,
      });
      setTxHash(hash);
      setStatus("done");
      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setStatus("error");
      return null;
    }
  }, [address, publicClient, writeContractAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { act, reset, status, txHash, error };
}
```

## Reading Before Writing

Use `publicClient.readContract` for onchain reads (allowances, quotes, prices):

```ts
const allowance = await publicClient.readContract({
  address: usdcAddress as `0x${string}`,
  abi: ERC20_ABI,
  functionName: "allowance",
  args: [userAddress, marketAddress],
});
```

## WalletProvider

Uses `@tanstack/react-query` + `wagmi` + `viem`. Also sets up Solana adapters (legacy drift code) but the active path is EVM via Wagmi.

## ABI Location

All shared ABIs live in `frontend/src/lib/contracts/prediction-market.ts`.
