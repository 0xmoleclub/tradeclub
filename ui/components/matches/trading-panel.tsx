"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { encodeFunctionData, parseEther, type Hex } from "viem";

interface TradingPanelProps {
  matchId: string;
  allowedDexes: string[];
}

interface DexMeta {
  name: string;
  address: string;
  logo?: string;
  description: string;
  supportsTrading: boolean;
  isMatchAllowed: boolean;
}

const KNOWN_DEXES: Omit<DexMeta, "isMatchAllowed">[] = [
  {
    name: "FUNDex",
    address: "0x16b0c1DCF87EBB4e0A0Ba4514FF0782CCE7889Cb",
    logo: "/dex-logos/fundex.png", // TODO: replace with actual asset
    description: "TradeClub's sandbox perpetuals DEX",
    supportsTrading: true,
  },
  {
    name: "Uniswap v3",
    address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    logo: "/dex-logos/uniswap.png", // TODO: replace with actual asset
    description: "Deep liquidity across blue chips",
    supportsTrading: false,
  },
  {
    name: "PancakeSwap",
    address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    logo: "/dex-logos/pancakeswap.png", // TODO: replace with actual asset
    description: "BNB chain AMM titan",
    supportsTrading: false,
  },
  {
    name: "SushiSwap",
    address: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    logo: "/dex-logos/sushiswap.png", // TODO: replace with actual asset
    description: "Cross-chain AMM with incentives",
    supportsTrading: false,
  },
];

const FUNDEX_ABI = [
  {
    type: "function",
    name: "openPosition",
    stateMutability: "payable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "positionType", type: "uint8" },
      { name: "leverage", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const MATCH_MANAGER_ABI = [
  {
    type: "function",
    name: "monachadExecuteTrade",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_matchId", type: "uint256" },
      { name: "_target", type: "address" },
      { name: "_calldata", type: "bytes" },
      { name: "_nativeAmount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const formatAddress = (value: string) =>
  `${value.slice(0, 6)}...${value.slice(-4)}`;

export default function TradingPanel({
  matchId,
  allowedDexes,
}: TradingPanelProps) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const allowedDexSet = useMemo(
    () => new Set(allowedDexes.map((dex) => dex.toLowerCase())),
    [allowedDexes]
  );

  const decoratedDexes = useMemo<DexMeta[]>(() => {
    const normalizedKnown: DexMeta[] = KNOWN_DEXES.map((dex) => ({
      ...dex,
      isMatchAllowed:
        allowedDexSet.size === 0 ||
        allowedDexSet.has(dex.address.toLowerCase()),
    }));

    const unknownAllowed = allowedDexes
      .filter(
        (dex) =>
          !KNOWN_DEXES.some(
            (known) => known.address.toLowerCase() === dex.toLowerCase()
          )
      )
      .map<DexMeta>((dex) => ({
        name: `Custom DEX (${formatAddress(dex)})`,
        address: dex,
        description: "Configured specifically for this match",
        supportsTrading: false,
        logo: undefined,
        isMatchAllowed: true,
      }));

    return [...normalizedKnown, ...unknownAllowed];
  }, [allowedDexSet, allowedDexes]);

  const firstAllowedDex = useMemo(
    () => decoratedDexes.find((dex) => dex.isMatchAllowed) ?? null,
    [decoratedDexes]
  );

  const [selectedDex, setSelectedDex] = useState<string>(
    firstAllowedDex?.address ?? ""
  );
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [positionType, setPositionType] = useState<"LONG" | "SHORT">("LONG");
  const [assetId, setAssetId] = useState("0");
  const [leverage, setLeverage] = useState("2");
  const [collateral, setCollateral] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (
      selectedDex &&
      decoratedDexes.some(
        (dex) => dex.address === selectedDex && dex.isMatchAllowed
      )
    ) {
      return;
    }

    setSelectedDex(firstAllowedDex?.address ?? "");
  }, [decoratedDexes, firstAllowedDex, selectedDex]);

  useEffect(() => {
    if (!actionError) {
      return;
    }

    const timeout = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(timeout);
  }, [actionError]);

  const selectedDexMeta = useMemo(
    () =>
      decoratedDexes.find((dex) => dex.address === selectedDex) ??
      firstAllowedDex,
    [decoratedDexes, firstAllowedDex, selectedDex]
  );

  const isTradingSupported = Boolean(selectedDexMeta?.supportsTrading);

  const handleOpenPosition = async () => {
    setActionError(null);

    if (!selectedDexMeta || !selectedDexMeta.isMatchAllowed) {
      setActionError("Select an allowed DEX before opening a position.");
      return;
    }

    if (!selectedDexMeta.supportsTrading) {
      setActionError(
        `${selectedDexMeta.name} trading integration is coming soon.`
      );
      return;
    }

    if (!address) {
      setActionError("Connect your wallet to trade.");
      return;
    }

    const matchManagerAddress = process.env
      .NEXT_PUBLIC_MATCH_MANAGER_ADDRESS as `0x${string}` | undefined;

    if (!matchManagerAddress) {
      setActionError("NEXT_PUBLIC_MATCH_MANAGER_ADDRESS is not configured.");
      return;
    }

    if (!collateral.trim()) {
      setActionError("Enter collateral to size your position.");
      return;
    }

    try {
      parseEther(collateral);
    } catch (error) {
      setActionError("Collateral must be a valid ETH amount.");
      return;
    }

    let normalizedMatchId: bigint;
    try {
      normalizedMatchId = BigInt(matchId);
    } catch (error) {
      setActionError("Invalid match identifier provided.");
      return;
    }

    let encodedTrade: Hex;
    try {
      encodedTrade = encodeFunctionData({
        abi: FUNDEX_ABI,
        functionName: "openPosition",
        args: [
          BigInt(assetId),
          positionType === "LONG" ? 0 : 1,
          BigInt(leverage),
        ],
      });
    } catch (error) {
      console.error("Failed to encode trade calldata", error);
      setActionError("Unable to encode trade calldata for the selected DEX.");
      return;
    }

    try {
      writeContract({
        address: matchManagerAddress,
        abi: MATCH_MANAGER_ABI,
        functionName: "monachadExecuteTrade",
        args: [
          normalizedMatchId,
          selectedDexMeta.address as Hex,
          encodedTrade,
          parseEther(collateral),
        ],
        account: address,
      });
    } catch (error: any) {
      console.error("Failed to open position", error);
      setActionError("Unable to submit transaction. Please try again.");
    }
  };

  const positionSizeEth = useMemo(() => {
    if (!collateral || !leverage) {
      return "0";
    }

    const base = Number.parseFloat(collateral);
    const lev = Number.parseFloat(leverage);

    if (!Number.isFinite(base) || !Number.isFinite(lev)) {
      return "0";
    }

    return (base * lev).toFixed(4);
  }, [collateral, leverage]);

  return (
    <section className="rounded-3xl border border-purple-500/40 bg-black/60 p-8 shadow-[0_30px_60px_-35px_rgba(88,28,135,0.9)] backdrop-blur">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">Trading Controls</h3>
          <p className="mt-1 text-sm text-purple-200/70">
            Execute positions on match-approved venues. Collateral moves via your
            delegated smart account.
          </p>
        </div>
        <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-100">
          Match #{matchId.slice(0, 6)}
        </span>
      </header>

      <div className="mt-8 space-y-8">
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">
            Select Battleground
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {decoratedDexes.map((dex) => {
              const isActive = selectedDex === dex.address;
              const isAllowed = dex.isMatchAllowed;

              return (
                <button
                  key={dex.address}
                  type="button"
                  onClick={() => {
                    if (!isAllowed) return;
                    setSelectedDex(dex.address);
                  }}
                  disabled={!isAllowed}
                  className={`relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                    isAllowed
                      ? isActive
                        ? "border-purple-400/80 bg-purple-500/20 shadow-[0_0_35px_rgba(168,85,247,0.35)]"
                        : "border-purple-400/30 bg-black/70 hover:border-purple-400/60 hover:bg-purple-500/10"
                      : "cursor-not-allowed border-purple-500/10 bg-black/40 text-purple-300/40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {dex.logo ? (
                      <img
                        src={dex.logo}
                        alt={`${dex.name} logo`}
                        className="h-12 w-12 rounded-xl border border-purple-500/30 bg-black/40 object-contain"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-600/40 via-fuchsia-500/30 to-blue-500/30" />
                    )}
                    <div>
                      <p className="text-base font-semibold text-purple-100">
                        {dex.name}
                      </p>
                      <p className="text-xs text-purple-200/60">{dex.description}</p>
                    </div>
                  </div>
                  <span className="mt-3 block text-[11px] uppercase tracking-[0.35em] text-purple-200/60">
                    {isAllowed
                      ? dex.supportsTrading
                        ? "Live"
                        : "Read-only"
                      : "Disabled"}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedDexMeta && (
            <p className="text-xs text-purple-200/60">
              {selectedDexMeta.supportsTrading
                ? `Routing orders through ${selectedDexMeta.name}.`
                : `${selectedDexMeta.name} is view-only until integration lands.`}
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.35em] text-purple-200/70">
              Asset
            </label>
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className="w-full rounded-2xl border border-purple-500/30 bg-black/70 px-4 py-3 text-white focus:border-purple-400 focus:outline-none"
            >
              <option value="0">BTC / USD</option>
              <option value="1">ETH / USD</option>
              <option value="2">SOL / USD</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.35em] text-purple-200/70">
              Order Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderType("market")}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  orderType === "market"
                    ? "border-blue-400/80 bg-blue-500/20 text-white"
                    : "border-purple-500/30 bg-black/70 text-purple-200/70 hover:border-purple-400/60 hover:text-white"
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType("limit")}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  orderType === "limit"
                    ? "border-blue-400/80 bg-blue-500/20 text-white"
                    : "border-purple-500/30 bg-black/70 text-purple-200/70 hover:border-purple-400/60 hover:text-white"
                }`}
              >
                Limit
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.35em] text-purple-200/70">
              Position Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPositionType("LONG")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  positionType === "LONG"
                    ? "border-green-400/80 bg-green-500/20 text-white"
                    : "border-purple-500/30 bg-black/70 text-purple-200/70 hover:border-purple-400/60 hover:text-white"
                }`}
              >
                Go Long
              </button>
              <button
                type="button"
                onClick={() => setPositionType("SHORT")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  positionType === "SHORT"
                    ? "border-red-400/80 bg-red-500/20 text-white"
                    : "border-purple-500/30 bg-black/70 text-purple-200/70 hover:border-purple-400/60 hover:text-white"
                }`}
              >
                Go Short
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-purple-200/70">
              <span>Leverage</span>
              <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-100">
                {leverage}x
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={leverage}
              onChange={(event) => setLeverage(event.target.value)}
              className="w-full accent-purple-400"
            />
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-xs uppercase tracking-[0.35em] text-purple-200/70">
            Collateral (ETH)
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={collateral}
            onChange={(event) => setCollateral(event.target.value)}
            placeholder="0.00"
            className="w-full rounded-2xl border border-purple-500/30 bg-black/70 px-4 py-3 text-white placeholder:text-purple-200/40 focus:border-purple-400 focus:outline-none"
          />
          {selectedDexMeta && (
            <p className="text-xs text-purple-200/60">
              Collateral routes through {selectedDexMeta.name} using match escrow.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <button
            type="button"
            onClick={handleOpenPosition}
            disabled={
              !collateral ||
              isPending ||
              isConfirming ||
              !isTradingSupported ||
              !selectedDexMeta?.isMatchAllowed
            }
            className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-purple-500/50 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-[0_0_45px_rgba(129,140,248,0.35)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:border-purple-500/30 disabled:from-purple-700/40 disabled:via-fuchsia-700/40 disabled:to-blue-700/40 disabled:opacity-60"
          >
            {isPending || isConfirming ? "Submitting trade..." : `Open ${positionType} position`}
          </button>

          {actionError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              ⚠️ {actionError}
            </div>
          )}

          {isSuccess && (
            <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              Position submitted. Await on-chain confirmation.
            </div>
          )}

          {!isTradingSupported && selectedDexMeta?.isMatchAllowed && (
            <div className="rounded-2xl border border-purple-500/30 bg-black/60 px-4 py-3 text-xs text-purple-200/70">
              Trading on {selectedDexMeta.name} is view-only right now. Integrations
              are rolling out soon.
            </div>
          )}
        </section>

        <section className="grid gap-3 rounded-2xl border border-purple-500/20 bg-black/60 px-5 py-4 text-sm text-purple-200/80 md:grid-cols-2">
          <div className="flex items-center justify-between">
            <span>Order Type</span>
            <strong className="text-white">{orderType.toUpperCase()}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Position Size</span>
            <strong className="text-white">{positionSizeEth} ETH</strong>
          </div>
        </section>
      </div>
    </section>
  );
}
