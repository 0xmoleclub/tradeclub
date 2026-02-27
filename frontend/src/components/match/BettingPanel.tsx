"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { usePredictionMarkets } from "@/hooks/usePredictionMarkets";
import { useChainInfo } from "@/hooks/useChainInfo";
import { useQuoteBuy } from "@/hooks/useQuoteBuy";
import { useBuyShares } from "@/hooks/useBuyShares";

interface BettingPanelProps {
  battleId: string;
}

const PRESET_AMOUNTS = ["25", "100", "500"];

const OUTCOME_STYLES: Record<
  number,
  { label: string; color: string; border: string; bg: string }
> = {
  0: {
    label: "Player 1",
    color: "text-cyan-400",
    border: "border-cyan-500/30 hover:border-cyan-400",
    bg: "bg-cyan-900/10 hover:bg-cyan-900/20",
  },
  1: {
    label: "Player 2",
    color: "text-magenta-400",
    border: "border-magenta-500/30 hover:border-magenta-400",
    bg: "bg-magenta-900/10 hover:bg-magenta-900/20",
  },
};
const outcomeStyle = (i: number) =>
  OUTCOME_STYLES[i] ?? {
    label: `Outcome ${i}`,
    color: "text-white",
    border: "border-white/20 hover:border-white/50",
    bg: "bg-white/5 hover:bg-white/10",
  };

export const BettingPanel = ({ battleId }: BettingPanelProps) => {
  const { address } = useAccount();
  const walletChainId = useChainId();

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState("100");

  const { data: marketsData, isLoading: marketsLoading } =
    usePredictionMarkets(battleId);
  const question = marketsData?.markets?.[0] ?? null;
  const { data: chainInfo } = useChainInfo(battleId, question?.id ?? null);

  // Spot price for the selected outcome (float 0–1)
  const spotPrice = useMemo(() => {
    if (selectedOutcome === null || !question) return null;
    const c = question.choices.find((c) => c.outcome === selectedOutcome);
    return c ? parseFloat(c.spotPrice) : null;
  }, [selectedOutcome, question]);

  const amountUsd = parseFloat(amountInput) || 0;

  // Approx shares in WAD: amountUsd / spotPrice * 1e18
  const sharesWad = useMemo((): bigint => {
    if (!spotPrice || spotPrice <= 0 || amountUsd <= 0) return 0n;
    return BigInt(Math.round((amountUsd / spotPrice) * 1e18));
  }, [amountUsd, spotPrice]);

  const { data: quoteResult, isLoading: quoteLoading } = useQuoteBuy(
    question?.marketAddress ?? null,
    selectedOutcome ?? 0,
    sharesWad,
  );

  const [costUsdc6, feeUsdc6] = (quoteResult as readonly [bigint, bigint]) ?? [
    null,
    null,
  ];
  const totalCostUsdc6 =
    costUsdc6 != null && feeUsdc6 != null ? costUsdc6 + feeUsdc6 : null;
  const costUsdDisplay =
    totalCostUsdc6 != null
      ? `$${(Number(totalCostUsdc6) / 1e6).toFixed(2)}`
      : null;
  const sharesDisplay =
    sharesWad > 0n ? (Number(sharesWad) / 1e18).toFixed(4) : null;
  const payoutDisplay =
    sharesWad > 0n ? `$${(Number(sharesWad) / 1e18).toFixed(2)}` : null;
  const maxCostUsdc6 =
    totalCostUsdc6 != null
      ? BigInt(Math.ceil(Number(totalCostUsdc6) * 1.01))
      : 0n;

  const { buy, reset, isPending, status, txHash, error } = useBuyShares(
    question?.marketAddress ?? null,
    chainInfo?.usdcAddress ?? null,
    address ?? null,
  );

  const wrongChain = !!(chainInfo && walletChainId !== chainInfo.chainId);
  const canConfirm =
    !!address &&
    !wrongChain &&
    selectedOutcome !== null &&
    sharesWad > 0n &&
    totalCostUsdc6 != null &&
    !isPending &&
    question?.status === "ACTIVE";

  const oddsDisplay = (sp: string) => {
    const p = parseFloat(sp);
    return p > 0 ? `${(1 / p).toFixed(2)}x` : "—";
  };

  const handleConfirm = async () => {
    if (!canConfirm || selectedOutcome === null || maxCostUsdc6 === 0n) return;
    await buy(selectedOutcome, sharesWad, maxCostUsdc6);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-[#080808] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black italic uppercase text-white">
            Place Prediction
          </h3>
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded border border-white/10">
            <div
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${question?.status === "ACTIVE" ? "bg-green-500" : question?.status === "RESOLVED" ? "bg-yellow-500" : "bg-gray-500"}`}
            />
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">
              {question?.status ?? "Loading…"}
            </span>
          </div>
        </div>

        {/* Banners */}
        {!address && (
          <div className="mb-4 px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-center text-xs text-gray-400">
            Connect your wallet to place a prediction.
          </div>
        )}
        {wrongChain && (
          <div className="mb-4 px-4 py-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30 text-center text-xs text-yellow-400">
            Switch your wallet to chain ID {chainInfo?.chainId} to trade.
          </div>
        )}
        {!marketsLoading && question && !question.marketAddress && (
          <div className="mb-4 px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-center text-xs text-gray-400">
            Prediction market deploying on-chain…
          </div>
        )}
        {question?.status === "RESOLVED" &&
          question.resolvedOutcome != null && (
            <div className="mb-4 px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-center text-xs text-gray-400">
              Market resolved — Winner:{" "}
              <span className="text-white font-bold">
                {outcomeStyle(question.resolvedOutcome).label}
              </span>
            </div>
          )}

        <div className="flex-1 space-y-6">
          {/* Outcome selection */}
          {marketsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(question?.choices ?? []).slice(0, 2).map((choice) => {
                const s = outcomeStyle(choice.outcome);
                const isSelected = selectedOutcome === choice.outcome;
                return (
                  <button
                    key={choice.outcome}
                    onClick={() => setSelectedOutcome(choice.outcome)}
                    className={`group relative p-4 border rounded-xl transition-all text-left ${s.bg} ${s.border} ${isSelected ? "ring-2 ring-white/30" : ""}`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase mb-1 ${s.color}`}
                    >
                      {s.label}
                    </div>
                    <div className="text-2xl font-mono font-bold text-white">
                      {oddsDisplay(choice.spotPrice)}
                    </div>
                    <div className="text-[9px] font-mono text-gray-500 mt-0.5">
                      {(parseFloat(choice.spotPrice) * 100).toFixed(1)}% prob
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Amount input */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase font-bold">
              <span>Wager Amount (USDC)</span>
            </div>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg py-4 pl-8 pr-4 font-mono text-white text-xl focus:border-white/40 outline-none transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmountInput(val)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold rounded text-gray-400 hover:text-white transition-colors"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quote stats */}
          <div className="p-4 bg-white/5 rounded-lg space-y-2 border border-white/5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-500">Est. Payout (if win)</span>
              <span className="text-green-400 font-bold">
                {payoutDisplay ?? "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-500">Shares</span>
              <span className="text-white">{sharesDisplay ?? "—"}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-500">Total Cost (incl. fee)</span>
              <span className="text-white">
                {quoteLoading && sharesWad > 0n ? "…" : (costUsdDisplay ?? "—")}
              </span>
            </div>
          </div>
        </div>

        {/* TX feedback */}
        {status === "done" && txHash && (
          <div className="mt-3 px-4 py-2 bg-green-900/20 rounded-lg border border-green-500/30 text-[10px] text-green-400 font-mono break-all">
            ✓ {txHash}
            <button
              onClick={reset}
              className="ml-2 underline text-gray-400 hover:text-white"
            >
              New bet
            </button>
          </div>
        )}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-900/20 rounded-lg border border-red-500/30 text-[10px] text-red-400">
            {error}
            <button onClick={reset} className="ml-2 underline hover:text-white">
              Retry
            </button>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full py-4 mt-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-lg hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isPending
            ? status === "approving"
              ? "Approving USDC…"
              : "Confirming…"
            : "Confirm Bet"}
        </button>
      </div>
    </div>
  );
};
