"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

interface User {
  id: string;
  evmAddress: string;
  name?: string;
  avatar?: string;
  role: string;
  status: string;
}

interface AuthContextType {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  provider: ethers.BrowserProvider | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  login: () => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedAddress = localStorage.getItem('walletAddress');
    
    if (storedToken && storedAddress) {
      setToken(storedToken);
      setWalletAddress(storedAddress);
      setIsConnected(true);
      // Verify token is still valid
      checkAuthStatus(storedToken);
    }
  }, []);

  // Check if ethereum is available
  const getEthereum = () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  };

  // Check auth status with backend
  const checkAuthStatus = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data);
        return true;
      } else {
        // Token expired or invalid
        disconnect();
        return false;
      }
    } catch (error) {
      console.error('[Auth] Check auth failed:', error);
      return false;
    }
  };

  // Connect wallet
  const connect = async () => {
    const ethereum = getEthereum();
    
    if (!ethereum) {
      alert('Please install MetaMask or another EVM wallet');
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const newProvider = new ethers.BrowserProvider(ethereum);
      
      setProvider(newProvider);
      setWalletAddress(address);
      setIsConnected(true);
      
      localStorage.setItem('walletAddress', address);

      // Listen for account changes
      ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          disconnect();
        } else {
          setWalletAddress(newAccounts[0]);
          localStorage.setItem('walletAddress', newAccounts[0]);
        }
      });

      // Listen for chain changes
      ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('[Auth] Connection failed:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setIsConnected(false);
    setUser(null);
    setToken(null);
    setWalletAddress(null);
    setProvider(null);
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('walletAddress');
  };

  // Login with signature
  const login = async (): Promise<boolean> => {
    if (!walletAddress || !provider) {
      alert('Please connect wallet first');
      return false;
    }

    try {
      // 1. Get nonce from backend
      const nonceResponse = await fetch(
        `${API_BASE_URL}/auth/nonce?walletAddress=${walletAddress}`
      );
      
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce, message } = await nonceResponse.json();

      // 2. Sign message with wallet
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 3. Login with signature
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(error.message || 'Login failed');
      }

      const { accessToken, user: userData } = await loginResponse.json();

      // 4. Store token and user
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('accessToken', accessToken);

      return true;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      alert(error instanceof Error ? error.message : 'Login failed');
      return false;
    }
  };

  // Check auth (public method)
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    return checkAuthStatus(token);
  }, [token]);

  // Auto-login if connected but no token
  useEffect(() => {
    if (isConnected && walletAddress && !token && !isConnecting) {
      login();
    }
  }, [isConnected, walletAddress, token, isConnecting]);

  const value: AuthContextType = {
    isConnected,
    isConnecting,
    user,
    token,
    walletAddress,
    provider,
    connect,
    disconnect,
    login,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook for wallet-only connection (no auth required)
export const useWallet = () => {
  const { isConnected, walletAddress, provider, connect, disconnect } = useAuth();
  return { isConnected, walletAddress, provider, connect, disconnect };
};

// Hook for authenticated requests
export const useAuthenticatedFetch = () => {
  const { token, checkAuth } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      // Check token is still valid
      const isValid = await checkAuth();
      if (!isValid) {
        throw new Error('Not authenticated');
      }

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [token, checkAuth]
  );

  return authenticatedFetch;
};
