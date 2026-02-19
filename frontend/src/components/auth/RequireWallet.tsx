'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { Wallet, Loader2 } from 'lucide-react';

interface RequireWalletProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Simple wrapper that shows connect prompt if wallet not connected
export const RequireWallet = ({ children, fallback }: RequireWalletProps) => {
  const { isConnected, isConnecting } = useAccount();

  if (isConnecting) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        <span className="text-xs">Connecting wallet...</span>
      </div>
    );
  }

  if (!isConnected) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-600 gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-gray-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white">Connect Wallet</p>
          <p className="text-xs text-gray-500 mt-1">
            Connect your wallet to view personal trading data
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for components that need wallet check
export const useWalletGuard = () => {
  const { isConnected, isConnecting } = useAccount();
  
  return {
    isConnected,
    isConnecting,
    isReady: isConnected && !isConnecting,
  };
};
