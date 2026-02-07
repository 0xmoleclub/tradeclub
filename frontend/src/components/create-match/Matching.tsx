import { GlassPanel } from "../ui/GlassPanel";
import { useCountdown } from "../../hooks/useCountDown";
import { useEffect } from "react";
import { PlayerCard } from "./PlayerCard";
import { Player } from "@/hooks/useMatching";

interface MatchingProps {
    matching: boolean;
    players: Player[];
    setMatching: (matching: boolean) => void;
}

export const Matching = ({ matching, players, setMatching }: MatchingProps) => {
    const { seconds, start, reset } = useCountdown(30);

    useEffect(() => {
        matching ? start() : reset();
    }, [matching, start, reset]);
    return (
        <GlassPanel
            className={`
                rounded-3xl p-6 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]
                transition-opacity duration-500 ease-in-out
                ${matching ? "opacity-100 visible" : "opacity-0"}`}
        >
            <div className="flex flex-col gap-6">
                {/* COUNTDOWN TITLE */}
                <h2 className="text-2xl font-bold text-center tracking-widest">
                    {seconds}s <span className="uppercase">remaining...</span>
                </h2>

                {/* OPPONENTS FOUND */}
                <div className="grid grid-cols-4 gap-4 ease-in-out transition-all duration-500">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
            </div>
        </GlassPanel>
    );
};
