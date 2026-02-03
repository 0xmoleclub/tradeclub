import React from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const ChatSidebar = () => {
  return (
    <GlassPanel className="w-80 hidden lg:flex flex-col rounded-3xl">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat History</span>
          <button className="text-gray-500 hover:text-white transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Search logs..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-[10px] text-white focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {["BTC Volatility Analysis", "Match #8421 Prediction", "Syndicate Alpha Stats", "Whale Alert: 500 ETH", "Liquidation Risk Calc", "Trend Analysis: SOL"].map((item, i) => (
          <button key={i} className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors group flex items-center gap-3">
            <MessageSquare size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
            <span className="text-xs font-mono text-gray-400 group-hover:text-white truncate">{item}</span>
          </button>
        ))}
      </div>
    </GlassPanel>
  );
};
