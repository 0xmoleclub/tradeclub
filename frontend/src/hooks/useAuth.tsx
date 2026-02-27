'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { authApi, AuthResponse } from '@/services/trading';

// Auth State Types
type AuthStatus = 'idle' | 'connected' | 'signing' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  user: AuthResponse['user'] | null;
  error: string | null;
  hasAttemptedSign: boolean;
}

interface AuthContextType extends AuthState {
  // Actions
  signIn: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  // Computed states
  isAuthenticated: boolean;  // Full auth (can trade)
  isConnected: boolean;      // Wallet connected (can view personal data)
  isSigning: boolean;        // Waiting for signature
  canTrade: boolean;         // Shorthand for isAuthenticated
  canViewPersonalData: boolean; // Shorthand for isConnected
}

// Create Context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected: isWalletConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [state, setState] = useState<AuthState>({
    status: 'idle',
    user: null,
    error: null,
    hasAttemptedSign: false,
  });

  const isInitializedRef = useRef(false);
  const hasCheckedInitialAuthRef = useRef(false);

  // Check for existing auth on mount (client-side only)
  useEffect(() => {
    // Only run once on initial mount
    if (hasCheckedInitialAuthRef.current) return;
    if (typeof window === 'undefined') return;
    
    const token = authApi.getToken();
    
    // If we have a token, restore authenticated state immediately
    // Don't wait for wallet connection state (Wagmi might still be hydrating)
    if (token) {
      setState(prev => ({
        ...prev,
        status: 'authenticated',
      }));
    }
    
    hasCheckedInitialAuthRef.current = true;
    
    // Small delay before marking as initialized to let Wagmi hydrate
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 100);
  }, []);

  // Update status when wallet connection changes
  useEffect(() => {
    // Only run after initial mount and hydration
    if (!isInitializedRef.current) return;

    // Wallet just connected (not on initial mount)
    if (isWalletConnected && (state.status === 'idle' || state.status === 'error')) {
      const token = authApi.getToken();
      if (token) {
        setState(prev => ({ ...prev, status: 'authenticated' }));
      } else {
        setState(prev => ({ ...prev, status: 'connected', hasAttemptedSign: false }));
      }
    }
    
    // Wallet disconnected after initialization -> reset everything
    if (!isWalletConnected && state.status !== 'idle') {
      authApi.logout();
      setState({
        status: 'idle',
        user: null,
        error: null,
        hasAttemptedSign: false,
      });
    }
    
    // After initialization, if we have a token but no wallet, clear the stale token
    if (!isWalletConnected && authApi.getToken()) {
      authApi.logout();
    }
  }, [isWalletConnected, state.status]);

  // Auto sign-in when connected (one attempt)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    // Auto-trigger sign-in when:
    // 1. Wallet is connected
    // 2. Status is 'connected' (not yet authenticated)
    // 3. Haven't attempted sign yet
    // 4. No error
    // 5. Address exists
    if (isWalletConnected && address && state.status === 'connected' && !state.hasAttemptedSign && !state.error) {
      setState(prev => ({ ...prev, hasAttemptedSign: true }));
      
      // Longer delay to ensure wallet is fully ready
      const timer = setTimeout(() => {
        signIn().catch(() => {
          // Reset hasAttemptedSign on failure so user can retry
          setState(prev => ({ ...prev, hasAttemptedSign: false }));
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalletConnected, address, state.status, state.hasAttemptedSign, state.error]);

  // Sign In Flow
  const signIn = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    if (!connector) {
      setState(prev => ({ ...prev, error: 'No wallet connector found' }));
      return;
    }

    // Prevent double sign-in attempts
    if (state.status === 'signing' || state.status === 'authenticated') {
      return;
    }

    setState(prev => ({ ...prev, status: 'signing', error: null }));

    try {
      // Step 1: Get nonce from backend
      console.log('[useAuth] Getting nonce for address:', address);
      const { message } = await authApi.getNonce(address);
      console.log('[useAuth] Got message to sign:', message);
      
      // Step 2: Sign the message using connector directly
      console.log('[useAuth] Requesting signature from connector:', connector.name);
      
      // Use the connector's signMessage method directly
      const signature = await connector.getProvider().then((provider: any) => {
        return provider.request({
          method: 'personal_sign',
          params: [message, address],
        });
      });
      
      console.log('[useAuth] Got signature:', signature.slice(0, 20) + '...');
      
      // Step 3: Verify and get token
      const authResponse = await authApi.login(address, signature);
      
      setState({
        status: 'authenticated',
        user: authResponse.user,
        error: null,
        hasAttemptedSign: true,
      });
      
      console.log('[useAuth] Authentication successful');
    } catch (err: any) {
      console.error('[useAuth] Sign in failed:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err?.message || err?.toString() || 'Authentication failed',
      }));
      throw err;
    }
  }, [address, connector, state.status]);

  // Sign Out
  const signOut = useCallback(() => {
    authApi.logout();
    disconnect();
    setState({
      status: 'idle',
      user: null,
      error: null,
      hasAttemptedSign: false,
    });
  }, [disconnect]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      error: null, 
      status: prev.status === 'error' ? 'connected' : prev.status,
      hasAttemptedSign: false, // Reset so we can try again
    }));
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signOut,
    clearError,
    isAuthenticated: state.status === 'authenticated',
    isConnected: isWalletConnected,
    isSigning: state.status === 'signing',
    canTrade: state.status === 'authenticated',
    canViewPersonalData: isWalletConnected,
    hasAttemptedSign: state.hasAttemptedSign,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for trading actions (requires full auth)
export function useRequireTrade() {
  const auth = useAuth();
  
  return {
    ...auth,
    requireTrade: useCallback(async (): Promise<boolean> => {
      if (auth.canTrade) return true;
      if (!auth.isConnected) return false;
      await auth.signIn();
      return auth.canTrade;
    }, [auth]),
  };
}

// Hook for viewing personal data (requires wallet connection only)
export function useRequireWallet() {
  const auth = useAuth();
  
  return {
    ...auth,
    requireWallet: useCallback((): boolean => {
      return auth.isConnected;
    }, [auth]),
  };
}
