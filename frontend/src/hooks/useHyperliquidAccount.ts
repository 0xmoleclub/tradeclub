'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

const API_URL = 'https://api.hyperliquid-testnet.xyz/info';

export interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  leverage: string;
  liquidationPx: string;
  marginUsed: string;
}

export interface AccountState {
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  positions: Position[];
}

interface UseAccountReturn {
  account: AccountState | null;
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHyperliquidAccount = (): UseAccountReturn => {
  const { address } = useAccount();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchAccount = useCallback(async () => {
    if (!address) {
      setAccount(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        type: 'clearinghouseState',
        user: address,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429) {
        // Rate limited - retry with exponential backoff
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          console.log(`[useHyperliquidAccount] Rate limited, retrying in ${delay}ms...`);
          setTimeout(fetchAccount, delay);
          return;
        }
        throw new Error('Rate limited. Please try again later.');
      }

      retryCountRef.current = 0;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[useHyperliquidAccount] API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Parse positions from assetPositions array
      const positions: Position[] = (data.assetPositions || [])
        .map((item: any) => item.position)
        .filter((p: Position | null) => p && parseFloat(p.szi) !== 0);

      const accountState: AccountState = {
        marginSummary: data.marginSummary || {
          accountValue: '0',
          totalMarginUsed: '0',
          totalNtlPos: '0',
          totalRawUsd: '0',
        },
        positions,
      };

      setAccount(accountState);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useHyperliquidAccount] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch account');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAccount();
    
    // Increase polling interval to reduce rate limiting
    const interval = setInterval(fetchAccount, 15000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAccount]);

  return {
    account,
    positions: account?.positions || [],
    isLoading,
    error,
    refetch: fetchAccount,
  };
};
