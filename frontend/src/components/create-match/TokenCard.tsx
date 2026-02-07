interface TokenCardProps {
    symbol: string;
    name: string;
    rate: string;
    MC: string;
    matching: boolean;
    isSelected?: boolean;
    handleSelect: () => void;
}

export const TokenCard = ({
    symbol,
    name,
    rate,
    MC,
    matching,
    isSelected,
    handleSelect,
}: TokenCardProps) => {
    return (
        <div
            className={`w-42 flex flex-col flex-shrink-0 items-center gap-2 p-2 border rounded-xl hover:bg-white/10 transition-colors select-none
                ${
                    isSelected
                        ? "bg-white/10 border-white/50"
                        : "bg-white/5 border-white/10"
                }
                ${matching ? "cursor-not-allowed" : "cursor-pointer"}`}
            onClick={matching ? undefined : handleSelect}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
                    {symbol}
                </div>
                <div>
                    <div className="text-sm font-bold text-white">{name}</div>
                </div>
            </div>
            <div>
                <span
                    className={`text-sm font-mono font-bold ${
                        rate.startsWith("+") ? "text-green-400" : "text-red-400"
                    }`}
                >
                    {rate}
                </span>

                <span className="mx-1 text-gray-500">|</span>
                <span className="text-sm text-gray-400">
                    <span className="font-mono">$MC</span>{" "}
                    <span className="tracking-wide">{MC}</span>
                </span>
            </div>
        </div>
    );
};
