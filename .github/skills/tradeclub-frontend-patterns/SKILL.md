---
name: tradeclub-frontend-patterns
description: Build and maintain the TradeClub Next.js 16 frontend. Covers App Router conventions, Wagmi/Viem Web3 hooks, TanStack Query API patterns, Socket.IO real-time integration, and the dark club Tailwind v4 styling system. Use when adding pages, components, hooks, or styling in the frontend.
---

# TradeClub Frontend Patterns

## Quick Overview

- **Framework**: Next.js 16.1.6 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + PostCSS, dark neon club aesthetic
- **Web3**: Wagmi 3 + Viem 2 for EVM, Solana wallet adapters still in deps (legacy)
- **State**: TanStack Query (React Query) for server state
- **Real-time**: Socket.IO client for battle events

## When to Use

- Adding new routes or page components
- Writing Wagmi hooks for contract interactions
- Building TanStack Query API wrappers
- Connecting to Socket.IO battle events
- Matching the existing dark/neon UI style

## Core References

- **Wagmi Patterns**: See [references/wagmi.md](references/wagmi.md)
- **API Layer**: See [references/api.md](references/api.md)
- **Styling Guide**: See [references/styling.md](references/styling.md)
- **Socket Events**: See [references/socket.md](references/socket.md)

## Route Conventions

App Router in `frontend/src/app/`:
- Page components are default exports, marked `"use client"` when interactivity is needed.
- Layout in `layout.tsx` wraps everything in `WalletProvider`.

## Component Conventions

```
frontend/src/components/domain/
├── ComponentName.tsx
frontend/src/hooks/
├── useDomainHook.ts
frontend/src/lib/api/
├── domain.ts
frontend/src/lib/contracts/
├── domain.ts      # ABIs + contract addresses
```

## Key Patterns

### Wagmi Hook Structure
Follow the `useBuyShares` pattern:
1. `usePublicClient()` for reads
2. `useWriteContract()` for writes
3. Local state for `status`, `txHash`, `error`
4. `useCallback` for the action function
5. Expose `reset()` and `isPending`

### TanStack Query API Wrapper
```ts
export function useMarkets(battleId?: string) {
  return useQuery<BattleMarketsResponse>({
    queryKey: ["markets", battleId],
    queryFn: () => fetchMarkets(battleId!),
    enabled: !!battleId,
    refetchInterval: 15_000,
  });
}
```

### Styling Defaults
- Background: `bg-[#050505]`
- Accent: magenta/pink neon glows
- Glass panels: `GlassPanel` component
- Fonts: Geist + Rajdhani fallback
