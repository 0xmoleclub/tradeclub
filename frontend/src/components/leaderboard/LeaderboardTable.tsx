import React from "react";
import { ChevronDown } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const LeaderboardTable = () => {
  return (
    <GlassPanel className="rounded-3xl flex flex-col min-h-[500px]">
      {/* Table Header */}
      <div className="p-6 border-b border-white/10 bg-white/[0.02]">
        <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4 md:col-span-3">Trader</div>
          <div className="col-span-3 md:col-span-2 text-right">PnL (30d)</div>
          <div className="col-span-2 text-right hidden md:block">Win Rate</div>
          <div className="col-span-2 text-right hidden md:block">Trades</div>
          <div className="col-span-4 md:col-span-2 text-right">Syndicate</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/[0.02] hover:bg-white/5 transition-colors group">
            <div className="col-span-1 text-center font-mono font-bold text-gray-400 group-hover:text-white">{i + 4}</div>
            <div className="col-span-4 md:col-span-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center text-xs">{["👻", "👽", "🤖", "👺", "💀"][i % 5]}</div>
              <span className="font-bold text-sm text-gray-200 group-hover:text-white truncate">Anon_Trader_{8420 + i}</span>
            </div>
            <div className="col-span-3 md:col-span-2 text-right font-mono font-bold text-green-400">+${(10000 - i * 500).toLocaleString()}</div>
            <div className="col-span-2 text-right font-mono text-gray-400 hidden md:block">{60 - i}%</div>
            <div className="col-span-2 text-right font-mono text-gray-500 hidden md:block">{142 - i * 2}</div>
            <div className="col-span-4 md:col-span-2 flex justify-end">
              <span
                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${i % 2 === 0 ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}
              >
                {i % 2 === 0 ? "Alpha_Sq" : "Void_Run"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex justify-center">
        <button className="text-[10px] font-mono font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
          Load More <ChevronDown size={14} />
        </button>
      </div>
    </GlassPanel>
  );
};
