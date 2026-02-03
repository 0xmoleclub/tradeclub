import React from "react";

export const BettingPanel = () => (
  <div className="h-full flex flex-col p-6 bg-[#080808] relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black italic uppercase text-white">Place Prediction</h3>
        <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded border border-white/10">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">Live Odds</span>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {/* Player Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button className="group relative p-4 bg-cyan-900/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/20 hover:border-cyan-400 transition-all text-left">
            <div className="text-[10px] font-bold text-cyan-500 uppercase mb-1">Trader Joe</div>
            <div className="text-2xl font-mono font-bold text-white group-hover:text-cyan-200">1.85x</div>
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-cyan-500/50 group-hover:bg-cyan-400 transition-colors" />
          </button>
          <button className="group relative p-4 bg-magenta-900/10 border border-magenta-500/30 rounded-xl hover:bg-magenta-900/20 hover:border-magenta-400 transition-all text-left">
            <div className="text-[10px] font-bold text-magenta-500 uppercase mb-1">Void Walker</div>
            <div className="text-2xl font-mono font-bold text-white group-hover:text-magenta-200">2.10x</div>
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-magenta-500/50 group-hover:bg-magenta-400 transition-colors" />
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase font-bold">
            <span>Wager Amount</span>
            <span>Bal: $4,240.50</span>
          </div>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">$</span>
            <input
              type="text"
              className="w-full bg-black border border-white/10 rounded-lg py-4 pl-8 pr-4 font-mono text-white text-xl focus:border-white/40 outline-none transition-colors"
              defaultValue="100"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {["100", "500", "MAX"].map((val) => (
                <button key={val} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold rounded text-gray-400 hover:text-white transition-colors">
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 bg-white/5 rounded-lg space-y-2 border border-white/5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-500">Est. Payout</span>
            <span className="text-green-400 font-bold">+$185.00</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-500">Pool Share</span>
            <span className="text-white">0.04%</span>
          </div>
        </div>
      </div>

      <button className="w-full py-4 mt-6 bg-white text-black font-black uppercase tracking-[0.2em] rounded-lg hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
        Confirm Bet
      </button>
    </div>
  </div>
);
