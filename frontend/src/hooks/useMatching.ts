import { useEffect, useState } from "react";

export interface Player {
    id: string;
    isYou: boolean;
    username: string;
    rank: number;
    stake: string;
}

export function useMatching() {
    const [matching, setMatching] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);

    const addPlayer = (player: Player) => {
        setMatching(true);
        if (players.length < 4) {
            setPlayers((prev) => [...prev, player]);
        }
    };

    const removePlayer = (username: string) => {
        setMatching(false);
        if (players.length > 0) {
            setPlayers((prev) =>
                prev.filter((player) => player.username !== username),
            );
        }
    };

    useEffect(() => {
        if (matching && players.length < 4) {
            const interval = setInterval(() => {
                const newPlayer: Player = {
                    id: Math.random().toString(36).substring(2, 9),
                    isYou: false,
                    username: `Player${Math.floor(Math.random() * 1000)}`,
                    rank: Math.floor(Math.random() * 1000),
                    stake: (Math.floor(Math.random() * 100) + 1).toString(),
                };
                addPlayer(newPlayer);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [matching, players.length]);

    return {
        matching,
        setMatching,
        players,
        addPlayer,
        removePlayer,
    };
}
