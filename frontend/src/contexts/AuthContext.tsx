"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// PLACEHOLDER: This is a simplified auth context
// The wallet connection implementation is handled by another team member

interface User {
  id: string;
  evmAddress: string;
  role: string;
  status: string;
}

interface AuthContextType {
  isConnected: boolean;
  isConnecting: boolean;
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  chainId: number | null;
  
  // Placeholder actions
  connect: () => void;
  disconnect: () => void;
  login: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PLACEHOLDER_ADDRESS = "0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8B9";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // TODO: Implement actual wallet connection
  const connect = () => {
    console.log("[Auth] Connect wallet - TODO: Implement");
    // Placeholder - will be implemented by assigned developer
  };

  const disconnect = () => {
    setIsConnected(false);
    setUser(null);
    setToken(null);
    console.log("[Auth] Disconnect - TODO: Implement");
  };

  const login = () => {
    console.log("[Auth] Login - TODO: Implement");
    // Placeholder - will be implemented by assigned developer
  };

  const value: AuthContextType = {
    isConnected,
    isConnecting,
    user,
    token,
    walletAddress: isConnected ? PLACEHOLDER_ADDRESS : null,
    chainId: isConnected ? 42161 : null,
    connect,
    disconnect,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
