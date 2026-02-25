"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export function useBattle(userId: string) {
    const socket = getSocket();

    const [battleId, setBattleId] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [status, setStatus] = useState("idle");

    // =========================
    // JOIN MATCHMAKING
    // =========================
    const joinQueue = (elo: number) => {
        setStatus("matching");

        socket.emit("battle.queue", {
            userId,
            elo,
        });
    };

    const leaveBattle = () => {
        if (!battleId) return;

        socket.emit("battle.leave", {
            battleId,
            userId,
        });
    };

    const ready = () => {
        if (!battleId) return;

        socket.emit("battle.ready", {
            battleId,
            userId,
        });
    };

    // =========================
    // LISTEN SERVER EVENTS
    // =========================
    useEffect(() => {
        // match found
        socket.on("battle.created", (data) => {
            setBattleId(data.battleId);
            setPlayers(data.players);
            setStatus("matched");

            // join battle room explicitly (optional)
            socket.emit("battle.join", {
                battleId: data.battleId,
                userId,
            });
        });

        socket.on("battle.started", () => {
            setStatus("running");
        });

        socket.on("battle.finished", (result) => {
            setStatus("finished");
            console.log("Battle result:", result);
        });

        socket.on("battle.cancelled", () => {
            setStatus("cancelled");
        });

        socket.on("battle.player.left", (data) => {
            console.log("Player left:", data);
        });

        return () => {
            socket.off("battle.created");
            socket.off("battle.started");
            socket.off("battle.finished");
            socket.off("battle.cancelled");
            socket.off("battle.player.left");
        };
    }, [socket, userId]);

    return {
        battleId,
        players,
        status,
        joinQueue,
        ready,
        leaveBattle,
    };
}
