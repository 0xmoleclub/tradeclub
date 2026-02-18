"use client";

import React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, arbitrum, base, optimism } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = createConfig({
  chains: [mainnet, arbitrum, base, optimism],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "TradeClub" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
});

const queryClient = new QueryClient();

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
