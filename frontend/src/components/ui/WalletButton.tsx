"use client";

import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletButtonProps {
  className?: string;
  variant?: 'default' | 'small' | 'nav';
}

// PLACEHOLDER: This is a simplified wallet button
// The full wallet connection implementation is handled by another team member

export const WalletButton = ({ className = '', variant = 'default' }: WalletButtonProps) => {
  const handleClick = () => {
    // TODO: Implement wallet connection
    console.log("[WalletButton] Connect clicked - TODO: Implement");
    alert("Wallet connection coming soon!");
  };

  const sizeClasses = variant === 'small' 
    ? 'px-3 py-1.5 text-[10px]' 
    : variant === 'nav' 
      ? 'px-4 py-2 text-xs' 
      : 'px-4 py-2 text-xs';
  
  const skewClass = variant === 'nav' ? 'skew-x-[-15deg]' : 'rounded-lg';
  const iconSize = variant === 'small' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-2 
        ${sizeClasses}
        font-bold uppercase tracking-widest 
        transition-all transform hover:scale-105 active:scale-95
        bg-neon/10 border border-neon/50 text-neon 
        hover:bg-neon hover:text-black 
        hover:shadow-[0_0_20px_rgba(208,0,255,0.3)]
        ${skewClass}
        ${className}
      `}
    >
      <Wallet className={iconSize} />
      {variant === 'nav' ? (
        <span className="skew-x-[15deg] inline-block">Connect</span>
      ) : (
        'Connect'
      )}
    </button>
  );
};
