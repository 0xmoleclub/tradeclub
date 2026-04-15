# Socket.IO Patterns

## Files

- `frontend/src/components/socket/SocketProvider.tsx`
- `frontend/src/lib/socket.ts`
- `frontend/src/hooks/useBattle.ts`
- `frontend/src/types/events.constants.ts`

## Client Setup

```ts
import { io, Socket } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  path: "/battle",
  auth: { userId },
});
```

## Provider Pattern

Wrap app or battle pages in `SocketProvider` to share a single socket instance via React context.

## Event Constants

Backend/frontend share event names. Frontend constants in `frontend/src/types/events.constants.ts`:

```ts
export const EVENTS = {
  BATTLE_QUEUE: "battle:queue",
  BATTLE_DEQUEUE: "battle:dequeue",
  BATTLE_READY: "battle:ready",
  BATTLE_FINISHED: "battle:finished",
  // ...
} as const;
```

## Hook Pattern

```ts
export function useBattle() {
  const socket = useSocket();

  const joinQueue = useCallback(() => {
    socket?.emit(EVENTS.BATTLE_QUEUE);
  }, [socket]);

  const ready = useCallback((battleId: string) => {
    socket?.emit(EVENTS.BATTLE_READY, { battleId });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on(EVENTS.MATCH_FOUND, (data) => {
      // handle match found
    });
    return () => {
      socket.off(EVENTS.MATCH_FOUND);
    };
  }, [socket]);

  return { joinQueue, ready };
}
```

## Backend Gateway

Namespace: `/battle`
- `handleConnection` joins `user:${userId}` room.
- `handleDisconnect` emits `PLAYER_LEFT` via EventEmitter2.
- Subscribe messages proxy to NestJS EventEmitter for battle lifecycle processing.
