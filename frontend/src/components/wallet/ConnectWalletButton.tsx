"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useEnsName, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { Wallet, LogOut, Copy, Check, ChevronDown, Zap, Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks";

interface ConnectWalletButtonProps {
  variant?: "navbar" | "page" | "inline";
}

export const ConnectWalletButton = ({ variant = "navbar" }: ConnectWalletButtonProps) => {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: balance } = useBalance({ address });
  
  // Auth state - using centralized hasAttemptedSign from auth context
  const { isAuthenticated, isSigning, hasAttemptedSign, signIn, signOut, error: authError, clearError } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const displayName = ensName || truncatedAddress;

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowWalletList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const handleDisconnect = useCallback(() => {
    signOut();
    setShowDropdown(false);
  }, [signOut]);

  const handleConnect = useCallback(async (connector: any) => {
    clearError();
    setShowWalletList(false);
    
    try {
      await connect({ connector });
    } catch (err: any) {
      console.error('[ConnectWalletButton] Connection error:', err);
      // Error will be captured by connectError from useConnect
    }
  }, [connect, clearError]);

  const handleRetrySign = useCallback(() => {
    clearError();
    // Small delay to let state update
    setTimeout(() => {
      signIn();
    }, 100);
  }, [clearError, signIn]);

  // Prevent hydration mismatch - show placeholder during SSR
  if (!mounted) {
    return (
      <div className="relative">
        <button disabled className={`group relative overflow-hidden ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}>
          <div className="absolute -inset-[1px] bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 opacity-30 blur-[1px]" />
          <div className={`relative flex items-center gap-3 border border-gray-600/30 ${variant === "navbar" ? "px-6 py-2.5 bg-black" : "px-5 py-2 rounded-lg bg-black/80"}`}>
            <div className="w-4 h-4 border-2 border-gray-600/30 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Loading...</span>
          </div>
        </button>
      </div>
    );
  }

  // ==================== STATE 1: FULLY AUTHENTICATED ====================
  if (isAuthenticated) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}
        >
          {/* Cyan glow for authenticated */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 opacity-60 blur-[1px] wallet-glow-connected" />
          <div className={`relative flex items-center gap-3 border border-cyan-500/50 transition-all duration-300 hover:border-cyan-400 ${variant === "navbar" ? "px-5 py-2.5 bg-black" : "px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
            {/* Status dot */}
            <div className={`relative flex h-2 w-2 ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            </div>
            {/* Shield icon */}
            <div className={variant === "navbar" ? "skew-x-[15deg]" : ""}>
              <Shield size={14} className="text-cyan-400" />
            </div>
            {/* Address */}
            <span className={`font-mono text-[11px] font-bold text-white tracking-wider ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              {displayName}
            </span>
            {/* Chevron */}
            <ChevronDown size={12} className={`text-gray-500 transition-transform duration-200 ${showDropdown ? "rotate-180 text-cyan-400" : ""} ${variant === "navbar" ? "skew-x-[15deg]" : ""}`} />
          </div>
        </button>

        {/* Authenticated Dropdown */}
        {showDropdown && (
          <div className={`absolute top-[calc(100%+8px)] right-0 w-64 z-[99999] animate-in fade-in slide-in-from-top-2 duration-200 ${variant === "navbar" ? "skew-x-0" : ""}`}>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
              <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                    <Shield size={14} className="text-black" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{activeConnector?.name || "Wallet"}</div>
                    <div className="text-xs font-mono text-white font-bold">{truncatedAddress}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded">Authenticated</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <><Check size={12} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                  ) : (
                    <><Copy size={12} /><span>Copy Address</span></>
                  )}
                </button>
              </div>
              <div className="p-2">
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors group/dc cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-white/5 group-hover/dc:bg-red-500/20 transition-colors">
                    <LogOut size={14} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== STATE 2: CONNECTING WALLET ====================
  // Show when actively connecting (before connection is established)
  if (isConnecting && !isConnected) {
    return (
      <div className="relative">
        <button disabled className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}>
          <div className="absolute -inset-[1px] bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 opacity-60 blur-[1px]" />
          <div className={`relative flex items-center gap-3 border border-yellow-500/50 transition-all duration-300 ${variant === "navbar" ? "px-5 py-2.5 bg-black" : "px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
            <div className={`${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            </div>
            <span className={`font-mono text-[11px] font-bold text-white tracking-wider ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              Connecting...
            </span>
          </div>
        </button>

        {/* Connection Error Popup */}
        {connectError && (
          <div className="absolute top-[calc(100%+8px)] right-0 w-80 z-[99999]">
            <div className="bg-[#0a0a0a] border border-red-500/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Connection Failed</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">{(connectError as Error)?.message || "Could not connect to wallet"}</p>
              {(connectError as Error)?.message?.includes('ethereum') && (
                <div className="text-[10px] text-yellow-400/80 bg-yellow-400/10 p-2 rounded">
                  <strong>Tip:</strong> Multiple wallet extensions detected. Try disabling other wallet extensions in your browser, or use Coinbase Wallet instead.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== STATE 3: SIGNING IN PROGRESS ====================
  // Wallet connected and currently signing (waiting for signature)
  if (isSigning) {
    return (
      <div className="relative">
        <button disabled className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}>
          <div className="absolute -inset-[1px] bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 opacity-60 blur-[1px]" />
          <div className={`relative flex items-center gap-3 border border-yellow-500/50 transition-all duration-300 ${variant === "navbar" ? "px-5 py-2.5 bg-black" : "px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
            <div className={`${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            </div>
            <span className={`font-mono text-[11px] font-bold text-white tracking-wider ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              Sign in wallet...
            </span>
          </div>
        </button>
      </div>
    );
  }

  // ==================== STATE 4: WALLET CONNECTED, NEEDS AUTH ====================
  // Wallet is connected but not yet authenticated - show "Sign to Authenticate" button
  if (isConnected && !isAuthenticated && !isSigning && !authError) {
    return (
      <div className="relative">
        <button
          onClick={handleRetrySign}
          className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}
        >
          {/* Yellow glow for needs-auth state */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 opacity-60 blur-[1px]" />
          <div className={`relative flex items-center gap-3 border border-yellow-500/50 transition-all duration-300 hover:border-yellow-400 ${variant === "navbar" ? "px-5 py-2.5 bg-black" : "px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
            {/* Status dot */}
            <div className={`relative flex h-2 w-2 ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
            </div>
            {/* Shield icon */}
            <div className={variant === "navbar" ? "skew-x-[15deg]" : ""}>
              <Shield size={14} className="text-yellow-400" />
            </div>
            {/* Text */}
            <span className={`font-mono text-[11px] font-bold text-white tracking-wider ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              Sign In
            </span>
          </div>
        </button>
      </div>
    );
  }

  // ==================== STATE 5: AUTH ERROR ====================
  // Connected but sign failed
  if (authError) {
    return (
      <div className="relative">
        <button disabled className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}>
          <div className="absolute -inset-[1px] bg-gradient-to-r from-red-500 via-red-400 to-red-500 opacity-60 blur-[1px]" />
          <div className={`relative flex items-center gap-3 border border-red-500/50 transition-all duration-300 ${variant === "navbar" ? "px-5 py-2.5 bg-black" : "px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
            <div className={`${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <span className={`font-mono text-[11px] font-bold text-white tracking-wider ${variant === "navbar" ? "skew-x-[15deg]" : ""}`}>
              Sign Failed
            </span>
          </div>
        </button>

        {/* Auth Error Popup */}
        <div className="absolute top-[calc(100%+8px)] right-0 w-72 z-[99999]">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Auth Failed</span>
            </div>
            <p className="text-[10px] text-gray-400">{authError}</p>
            <button
              onClick={handleRetrySign}
              className="mt-3 w-full py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold uppercase hover:bg-yellow-500/30 transition-colors"
            >
              Retry Sign
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== STATE 6: DISCONNECTED ====================
  // Default state - wallet not connected, clickable
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowWalletList(!showWalletList)}
        className={`group relative overflow-hidden cursor-pointer ${variant === "navbar" ? "skew-x-[-15deg] transform" : ""}`}
      >
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#d000ff] via-[#ff003c] to-[#d000ff] opacity-70 blur-[1px] wallet-glow-pulse bg-[length:200%_100%] animate-[wallet-border-flow_3s_linear_infinite]" />
        <div className={`relative flex items-center gap-3 border border-neon/30 transition-all duration-300 group-hover:border-neon/60 ${variant === "navbar" ? "px-6 py-2.5 bg-black" : "px-5 py-2 rounded-lg bg-black/80 backdrop-blur-sm"}`}>
          {/* Shimmer sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          {/* Background pulse on hover */}
          <div className="absolute inset-0 bg-neon/0 group-hover:bg-neon/10 transition-colors duration-300" />
          {/* Zap icon */}
          <div className={variant === "navbar" ? "skew-x-[15deg]" : ""}>
            <Zap size={16} className="text-neon group-hover:text-white transition-colors duration-200 drop-shadow-[0_0_4px_rgba(208,0,255,0.6)]" fill="currentColor" />
          </div>
          {/* Text */}
          <span className={`relative z-10 text-[11px] font-black uppercase tracking-[0.2em] text-neon group-hover:text-white transition-colors duration-200 ${variant === "navbar" ? "skew-x-[15deg]" : ""}`} style={{ textShadow: "0 0 8px rgba(208,0,255,0.5)" }}>
            Connect
          </span>
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neon/50 group-hover:border-neon transition-colors" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neon/50 group-hover:border-neon transition-colors" />
        </div>
      </button>

      {/* Wallet Selection Dropdown */}
      {showWalletList && (
        <div className={`absolute top-[calc(100%+8px)] right-0 w-72 z-[99999] animate-in fade-in slide-in-from-top-2 duration-200 ${variant === "navbar" ? "skew-x-0" : ""}`}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-neon to-transparent" />
            <div className="px-4 pt-4 pb-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white font-rajdhani">Select Wallet</h3>
              <p className="text-[10px] text-gray-600 font-mono mt-1 uppercase tracking-wider">Connect & Sign in one flow</p>
            </div>
            <div className="px-2 pb-2 space-y-1">
              {connectors.map((connector) => {
                // Get wallet name - handle injected connector specially
                const walletName = connector.name;
                const isInjected = connector.name === 'Injected';
                const isCoinbase = connector.name === 'Coinbase Wallet';
                const isWalletConnect = connector.name === 'WalletConnect';
                
                // Determine subtext based on connector type
                let subtext = 'EVM Wallet';
                if (isInjected) subtext = 'Auto-detected';
                if (isCoinbase) subtext = 'Secure & Easy';
                if (isWalletConnect) subtext = 'Mobile Wallets';
                
                return (
                  <button
                    key={connector.uid}
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group/wallet transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 group-hover/wallet:border-neon/30 flex items-center justify-center overflow-hidden transition-colors">
                      {connector.icon ? (
                        <img src={connector.icon} alt={walletName} width={24} height={24} className="rounded" />
                      ) : (
                        <Wallet size={18} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold text-gray-200 group-hover/wallet:text-white font-rajdhani transition-colors">
                        {walletName}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider group-hover/wallet:text-neon/60 transition-colors">
                        {subtext}
                      </div>
                    </div>
                    <div className="text-gray-700 group-hover/wallet:text-neon transition-colors">
                      <ChevronDown size={14} className="-rotate-90" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
