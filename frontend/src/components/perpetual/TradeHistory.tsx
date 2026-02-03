import React from "react";

export const TradeHistory = () => {
  const trades = Array.from({ length: 20 }, (_, i) => ({
    price: 98420 + (Math.random() - 0.5) * 50,
    size: Math.random() * 0.5,
    time: new Date().toLocaleTimeString(),
    side: Math.random() > 0.5 ? "buy" : "sell",
    id: i, // Needed for key
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Fills</span>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-[10px] font-mono">
          <thead className="text-gray-500 sticky top-0 bg-[#0a0a0a]">
            <tr>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 border-b border-white/[0.02]">
                <td className={`px-4 py-1.5 ${t.side === "buy" ? "text-cyan-400" : "text-magenta-400"}`}>{t.price.toFixed(1)}</td>
                <td className="px-4 py-1.5 text-gray-300">{t.size.toFixed(4)}</td>
                <td className="px-4 py-1.5 text-right text-gray-500">{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
