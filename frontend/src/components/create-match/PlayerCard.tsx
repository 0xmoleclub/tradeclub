import { Player } from "@/hooks/useMatching";
import Image from "next/image";

export const PlayerCard = ({ player }: { player: Player }) => {
    const { isYou, username, rank, stake } = player;

    return (
        <div
            className={`bg-white/10 rounded-2xl border-2 flex flex-col items-center gap-2 p-4 shadow-lg
                animate-in fade-in zoom-in duration-300
                ${isYou ? " border-acid/60 " : "border-violence"}`}
        >
            <span
                className={`text-sm font-semibold mb-4 ${
                    isYou ? "text-acid/60" : "text-violence/80"
                }`}
            >
                {isYou ? "You" : "Opponent"}
            </span>

            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/30 shadow-md">
                <Image
                    src="/avatar.png"
                    alt="Player avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                />
            </div>

            <h3
                className="text-center font-bold truncate max-w-[120px]"
                title={username}
            >
                {username}
            </h3>

            <p className="text-xs text-center text-solar font-mono">Rank {rank}</p>

            <p className="text-xs text-center text-acid/80 font-mono">
                Stake ${stake}
            </p>
        </div>
    );
};
