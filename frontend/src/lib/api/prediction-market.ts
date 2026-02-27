const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1";

// ── Shared types mirroring backend DTOs ──────────────────────────────────────

export type MarketStatus = "PENDING" | "ACTIVE" | "RESOLVED";

export interface ChoiceState {
  outcome: number;
  /** LMSR spot price as a decimal string, e.g. "0.650000" */
  spotPrice: string;
  /** Total shares outstanding (WAD integer as decimal string) */
  shares: string;
  /** Total USD volume traded (WAD integer as decimal string) */
  volume: string;
}

export interface MarketState {
  id: string;
  questionText: string;
  description: string | null;
  marketAddress: string | null;
  bScore: string;
  status: MarketStatus;
  outcomesCount: number;
  totalVolume: string;
  choices: ChoiceState[];
  resolvedOutcome: number | null;
}

export interface BattleMarketsResponse {
  battleId: string;
  markets: MarketState[];
}

export interface ChainInfoResponse {
  marketAddress: string | null;
  usdcAddress: string;
  chainId: number;
}

export interface UserPositionResponse {
  walletAddress: string;
  questionId: string;
  marketAddress: string | null;
  netShares: string;
  avgEntryPrice: string;
  totalCostUsd: string;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

/** GET /battle/:battleId/markets */
export function fetchMarkets(battleId: string): Promise<BattleMarketsResponse> {
  return get(`/battle/${battleId}/markets`);
}

/**
 * GET /battle/:battleId/markets/:questionId/chain-info
 * Returns the contract addresses + chainId for client-side signing.
 */
export function fetchChainInfo(
  battleId: string,
  questionId: string,
): Promise<ChainInfoResponse> {
  return get(`/battle/${battleId}/markets/${questionId}/chain-info`);
}

/**
 * GET /battle/:battleId/markets/:questionId/position?walletAddress=
 */
export function fetchUserPosition(
  battleId: string,
  questionId: string,
  walletAddress: string,
): Promise<UserPositionResponse> {
  return get(
    `/battle/${battleId}/markets/${questionId}/position?walletAddress=${walletAddress}`,
  );
}
