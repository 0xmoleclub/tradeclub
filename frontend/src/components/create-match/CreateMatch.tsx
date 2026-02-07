import { GlassPanel } from "@/components/ui/GlassPanel";
import { Search } from "lucide-react";
import { useState } from "react";
import { TokenCard } from "./TokenCard";
import { Player } from "@/hooks/useMatching";

const availableTokens = [
    { symbol: "ETH", name: "Ethereum", rate: "+12.5%", MC: "1.2B" },
    { symbol: "BTC", name: "Bitcoin", rate: "-8.3%", MC: "900M" },
    { symbol: "SOL", name: "Solana", rate: "+15.2%", MC: "300M" },
    { symbol: "ADA", name: "Cardano", rate: "+5.6%", MC: "400M" },
    { symbol: "DOT", name: "Polkadot", rate: "+9.1%", MC: "350M" },
    { symbol: "LTC", name: "Litecoin", rate: "+7.4%", MC: "250M" },
    { symbol: "XRP", name: "Ripple", rate: "+6.8%", MC: "200M" },
    { symbol: "DOGE", name: "Dogecoin", rate: "-3.2%", MC: "150M" },
    { symbol: "AVAX", name: "Avalanche", rate: "+11.3%", MC: "180M" },
    { symbol: "MATIC", name: "Polygon", rate: "+4.9%", MC: "220M" },
    { symbol: "UNI", name: "Uniswap", rate: "+2.5%", MC: "130M" },
    { symbol: "LINK", name: "Chainlink", rate: "-1.7%", MC: "160M" },
];

const formatStake = (value: number) => {
    return `${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

interface CreateMatchProps {
    matching: boolean;
    addPlayer: (player: Player) => void;
    removePlayer: (username: string) => void;
}

export const CreateMatch = ({
    matching,
    addPlayer,
    removePlayer,
}: CreateMatchProps) => {
    const [current, setCurrent] = useState<number>(1);
    const [duration, setDuration] = useState("15");

    const [tokenSearch, setTokenSearch] = useState("");
    const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

    const filteredTokens = availableTokens.filter(
        (token) =>
            token.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
            token.symbol.toLowerCase().includes(tokenSearch.toLowerCase()),
    );

    const isReady =
        selectedTokens.length > 0 && current > 0 && Number(duration) >= 15;

    const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace("$", "").replace(/,/g, "");

        const num = Number(raw);
        if (!Number.isNaN(num)) {
            setCurrent(num);
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDuration(e.target.value);
    };

    const toggleTokenSelection = (symbol: string) => {
        setSelectedTokens((prev) =>
            prev.includes(symbol)
                ? prev.filter((s) => s !== symbol)
                : [...prev, symbol],
        );
    };

    const handleMatching = () => {
        if (matching) removePlayer("You");
        else
            addPlayer({
                id: "you",
                isYou: true,
                username: "You",
                rank: 1,
                stake: formatStake(current),
            });
    };

    return (
        <GlassPanel className="rounded-3xl p-6 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className=" flex flex-col gap-6">
                {/* CUSTOMIZE INFORMATION */}
                <h1 className="text-3xl mx-auto uppercase italic font-bold text-white tracking-widest">
                    {matching
                        ? "Matching You to Opponents..."
                        : "Join a Battle"}
                </h1>
                <div className="flex flex-col gap-4">
                    {/* TOKEN SELECTION */}
                    <div className="flex flex-col gap-2 border border-white/10 rounded-2xl p-3">
                        <div className="flex flex-col gap-2">
                            <h4 className="text-sm font-mono px-2 select-none">
                                Select your Weapons
                            </h4>

                            {/* Search */}
                            <div className="relative group flex-1 sm:flex-none">
                                <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-white transition-colors"
                                />
                                <input
                                    disabled={matching}
                                    type="text"
                                    value={tokenSearch}
                                    onChange={(e) =>
                                        setTokenSearch(e.target.value)
                                    }
                                    placeholder="Search for tokens..."
                                    className={`
                                        w-full h-10 bg-black/40 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors${
                                            matching
                                                ? " cursor-not-allowed"
                                                : " cursor-text"
                                        }`}
                                />
                            </div>
                        </div>

                        {/* TOKEN LIST (CARD) */}
                        <div className="flex gap-2.5 overflow-x-auto py-2">
                            {filteredTokens.length > 0 ? (
                                filteredTokens.map((token) => (
                                    <TokenCard
                                        key={token.symbol}
                                        symbol={token.symbol}
                                        name={token.name}
                                        rate={token.rate}
                                        MC={token.MC}
                                        matching={matching}
                                        isSelected={selectedTokens.includes(
                                            token.symbol,
                                        )}
                                        handleSelect={() =>
                                            toggleTokenSelection(token.symbol)
                                        }
                                    />
                                ))
                            ) : (
                                <p className="text-[10px] select-none text-gray-500 font-mono mx-auto">
                                    No tokens found.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* STAKE CONFIGURATION */}
                    <div className="flex flex-col gap-2 border border-white/10 rounded-2xl p-3">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-2 flex-1">
                                <div className="text-[9px] text-gray-500 font-bold uppercase select-none">
                                    Stake Amount
                                </div>
                                <div className="bg-[#050505] flex items-center rounded-2xl py-2 px-4 border border-white/10 group-hover:border-white/20 transition-colors">
                                    <span className="text-sm font-mono">$</span>
                                    <input
                                        disabled={matching}
                                        type="text"
                                        inputMode="decimal"
                                        value={formatStake(current)}
                                        onChange={handleCurrentChange}
                                        placeholder="Enter amount to stake"
                                        className={`
                                            flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder-gray-600 p-2 h-8 ${
                                                matching
                                                    ? "cursor-not-allowed"
                                                    : "cursor-text"
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* DURATION SELECT */}
                            <div className="w-full flex flex-col gap-3">
                                <p className="text-xs font-mono text-gray-400">
                                    Duration:{" "}
                                    <strong>{`${duration}`} min</strong>
                                </p>

                                <div className="space-y-2">
                                    <input
                                        disabled={matching}
                                        type="range"
                                        value={Number(duration)}
                                        min={15}
                                        max={180}
                                        step={1}
                                        className={`
                                            custom-slider w-full h-2 rounded-full appearance-none bg-gradient-to-r from-green-400 to-orange-500 ${
                                                matching
                                                    ? "cursor-not-allowed"
                                                    : "cursor-pointer"
                                            }`}
                                        onChange={handleSliderChange}
                                    />

                                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                                        <span>15 min</span>
                                        <span>MAX 180 min</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <span>
                            <span className="text-xs text-gray-400 font-mono">
                                Balance:{" "}
                            </span>
                            <span className="text-xs text-white font-mono">
                                ${formatStake(10000)}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-6 z-50">
                        <button
                            disabled={!isReady}
                            onClick={handleMatching}
                            className={`
                                w-full px-8 py-3 text-white font-black text-xs uppercase tracking-[0.2em] skew-x-[-15deg] hover:text-black
                                shadow-[0_0_20px_rgba(208,0,255,0.2)] transition-all transform hover:scale-102 active:scale-95 duration-200
                                ${
                                    matching
                                        ? "bg-violence border-violence/50 backdrop-brightness-75"
                                        : "bg-neon border-neon/50 "
                                }
                                ${
                                    !isReady
                                        ? "opacity-50 cursor-not-allowed"
                                        : "cursor-pointer"
                                }`}
                        >
                            <span className="skew-x-[15deg] inline-block">
                                {matching ? "Cancel" : "Join Battle"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
};
