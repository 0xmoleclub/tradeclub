"use client";

import React from 'react';
import { Loader2, Wallet, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WalletButtonProps {
  className?: string;
  variant?: 'default' | 'small' | 'nav';
}

export const WalletButton = ({ className = '', variant = 'default' }: WalletButtonProps) => {
  const { isConnected, isConnecting, walletAddress, connect, disconnect, login, token } = useAuth();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className={`
          flex items-center gap-2 px-4 py-2 
          bg-neon/10 border border-neon/50 text-neon 
          font-bold text-xs uppercase tracking-widest 
          hover:bg-neon hover:text-black 
          transition-all transform hover:scale-105 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variant === 'nav' ? 'skew-x-[-15deg]' : 'rounded-lg'}
          ${className}
        `}
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        <span className={variant === 'nav' ? 'skew-x-[15deg]' : ''}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </span>
      </button>
    );
  }

  // Connected but not logged in - show login button
  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-mono hidden sm:block">
          {formatAddress(walletAddress || '')}
        </span>
        <button
          onClick={login}
          className={`
            flex items-center gap-2 px-4 py-2 
            bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 
            font-bold text-xs uppercase tracking-widest 
            hover:bg-yellow-500 hover:text-black 
            transition-all
            ${variant === 'nav' ? 'skew-x-[-15deg]' : 'rounded-lg'}
            ${className}
          `}
        >
          <Wallet className="w-4 h-4" />
          <span className={variant === 'nav' ? 'skew-x-[15deg]' : ''}>Login</span>
        </button>
      </div>
    );
  }

  // Connected and logged in - show wallet info with disconnect
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cyan-400 font-mono hidden sm:block">
        {formatAddress(walletAddress || '')}
      </span>
      <button
        onClick={disconnect}
        className={`
          flex items-center gap-2 px-3 py-2 
          bg-white/5 border border-white/10 text-gray-400 
          hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30
          transition-all
          ${variant === 'nav' ? 'skew-x-[-15deg]' : 'rounded-lg'}
          ${className}
        `}
        title="Disconnect"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};
