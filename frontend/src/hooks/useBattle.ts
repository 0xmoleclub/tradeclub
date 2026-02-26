"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { EVENTS } from "@/types/events.constants";

export interface BattlePlayer {
    userId: string;
    name: string;
    stake: number;
}

export interface BattleRoom {
    battleId: string;
    players: BattlePlayer[];
}

export type BattleStatus =
    | "idle"
    | "matching"
    | "matched"
    | "running"
    | "finished"
    | "cancelled";

export function useBattle(userId: string, stake?: number) {
    const socket = getSocket(userId);

    useEffect(() => {
        socket.connect();
    }, [socket]);

    const [battleId, setBattleId] = useState<string | null>(null);
    const [players, setPlayers] = useState<BattlePlayer[]>([]);
    const [status, setStatus] = useState<BattleStatus>("idle");

    // ========================
    // ACTIONS
    // ========================

    const joinQueue = useCallback(() => {
        console.log("Joining queue with stake:", stake);
        setStatus("matching");
        socket.emit(EVENTS.BATTLE_QUEUE, { userId, stake });
    }, [socket, stake, userId]);

    const leaveQueue = useCallback(() => {
        setStatus("idle");
        socket.emit(EVENTS.BATTLE_DEQUEUE, { userId });
    }, [socket, userId]);

    const ready = useCallback(() => {
        if (!battleId) return;
        socket.emit(EVENTS.BATTLE_READY, { battleId });
    }, [socket, battleId]);

    const finish = useCallback(() => {
        if (!battleId) return;
        socket.emit(EVENTS.BATTLE_FINISHED, { battleId });
    }, [socket, battleId]);

    const disconnect = useCallback(() => {
        socket.disconnect();
        setStatus("idle");
        setBattleId(null);
        setPlayers([]);
    }, [socket]);

    // ========================
    // SERVER EVENTS
    // ========================

    useEffect(() => {
        if (!socket) return;

        const handleCreated = (data: BattleRoom) => {
            setBattleId(data.battleId);
            setPlayers(data.players);
            setStatus("matched");
        };

        const handleStarted = () => setStatus("running");

        const handleFinished = ({ battleId }: { battleId: string }) => {
            setStatus("finished");
            console.log("Finished battle:", battleId);
        };

        const handleCancelled = () => {
            setStatus("cancelled");
            setBattleId(null);
            setPlayers([]);
        };

        const handlePlayerLeft = (userId: string) => {
            setPlayers((prev) => prev.filter((p) => p.userId !== userId));
        };

        socket.on(EVENTS.BATTLE_CREATED, handleCreated);
        socket.on(EVENTS.BATTLE_STARTED, handleStarted);
        socket.on(EVENTS.BATTLE_FINISHED, handleFinished);
        socket.on(EVENTS.BATTLE_CANCELLED, handleCancelled);
        socket.on(EVENTS.PLAYER_LEFT, handlePlayerLeft);

        return () => {
            socket.off(EVENTS.BATTLE_CREATED, handleCreated);
            socket.off(EVENTS.BATTLE_STARTED, handleStarted);
            socket.off(EVENTS.BATTLE_FINISHED, handleFinished);
            socket.off(EVENTS.BATTLE_CANCELLED, handleCancelled);
            socket.off(EVENTS.PLAYER_LEFT, handlePlayerLeft);
        };
    }, [socket]);

    return {
        battleId,
        players,
        status,
        joinQueue,
        leaveQueue,
        ready,
        finish,
        disconnect,
    };
}
