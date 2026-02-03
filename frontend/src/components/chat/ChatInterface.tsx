import React, { useState } from "react";
import { Sparkles, Terminal, Send } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const ChatInterface = () => {
  const [query, setQuery] = useState("");

  const suggestions = ["What matches are currently live?", "Predict the winner of Trader Joe vs Void Walker", "Analyze recent volatility in BTC-PERP", "Explain the 'Liquidity Wars' rules"];

  return (
    <GlassPanel className="flex-1 rounded-3xl flex flex-col relative overflow-hidden">
      {/* Central Content (Empty State) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-900/20 to-magenta-900/20 border border-purple-500/20 flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(168,85,247,0.1)]">
          <Sparkles size={32} className="text-purple-400" />
        </div>

        <h2 className="text-3xl font-black uppercase italic text-white mb-8 tracking-wide">
          How can I <span className="text-purple-400">Help</span> you?
        </h2>

        {/* Input Area */}
        <div className="w-full max-w-2xl relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-magenta-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
          <div className="relative bg-[#050505] rounded-2xl flex items-center p-2 border border-white/10 group-hover:border-white/20 transition-colors">
            <div className="pl-4 pr-2">
              <Terminal size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder-gray-600 h-12"
            />
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 active:scale-95">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-4 text-center">Suggested Queries</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-purple-500/30 transition-all text-left group"
                onClick={() => setQuery(s)}
              >
                <span className="text-xs font-mono text-gray-400 group-hover:text-purple-300 transition-colors">
                  {`> `}
                  {s}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05),transparent_70%)] pointer-events-none" />
    </GlassPanel>
  );
};
