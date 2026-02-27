'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { agentWalletApi } from '@/services/trading';

interface UseAgentWalletReturn {
  agentAddress: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAgentWallet = (): UseAgentWalletReturn => {
  const { isAuthenticated } = useAuth();
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentWallet = useCallback(async () => {
    if (!isAuthenticated) {
      setAgentAddress(null);
      console.log('[useAgentWallet] Not authenticated, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useAgentWallet] Fetching agent wallet...');
      const wallet = await agentWalletApi.get();
      console.log('[useAgentWallet] Agent wallet response:', wallet);
      setAgentAddress(wallet?.agentAddress || null);
      setError(null);
    } catch (err) {
      console.error('[useAgentWallet] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agent wallet');
      setAgentAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAgentWallet();
  }, [fetchAgentWallet]);

  return {
    agentAddress,
    isLoading,
    error,
    refetch: fetchAgentWallet,
  };
};
