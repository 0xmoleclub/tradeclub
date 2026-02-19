"use client";

import React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks";

// Get project ID from env or use empty (will disable WalletConnect if not set)
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

const config = createConfig({
  chains: [arbitrum], // Only Arbitrum
  connectors: [
    // Generic injected connector - detects ALL installed browser wallets
    // (MetaMask, Coinbase Wallet, Rainbow, Phantom, etc.)
    injected({
      shimDisconnect: true,
    }),
    // Coinbase Wallet (standalone - for users who prefer Coinbase's UI)
    coinbaseWallet({ 
      appName: "TradeClub",
      headlessMode: false,
    }),
    // WalletConnect (only if project ID is set) - for mobile wallets
    ...(projectId ? [walletConnect({
      projectId,
      metadata: {
        name: "TradeClub",
        description: "Professional perpetual trading platform",
        url: typeof window !== 'undefined' ? window.location.origin : 'https://tradeclub.xyz',
        icons: [],
      },
    })] : []),
  ],
  transports: {
    // Arbitrum RPC endpoint (CORS-friendly)
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
  },
  // Enable multi-injected provider discovery for better wallet detection
  multiInjectedProviderDiscovery: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
