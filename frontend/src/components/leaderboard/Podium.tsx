import React from "react";
import { Crown, Trophy, Flame, Star, Hexagon, Shield, Zap } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const Podium = () => {
  const topTraders = [
    {
      rank: 2,
      name: "Void_Walker",
      pnl: "+$482,000",
      winRate: "72%",
      avatar: "😈",
      color: "cyan",
      borderColor: "border-cyan-500",
      shadowColor: "shadow-cyan-500/50",
      gradient: "from-cyan-500/20",
      title: "Silent Killer",
    },
    {
      rank: 1,
      name: "Satoshi_Ghost",
      pnl: "+$892,420",
      winRate: "88%",
      avatar: "👑",
      color: "yellow",
      borderColor: "border-yellow-500",
      shadowColor: "shadow-yellow-500/50",
      gradient: "from-yellow-500/20",
      title: "Grand Master",
    },
    {
      rank: 3,
      name: "Neon_Sniper",
      pnl: "+$310,500",
      winRate: "65%",
      avatar: "🤖",
      color: "magenta",
      borderColor: "border-magenta-500",
      shadowColor: "shadow-magenta-500/50",
      gradient: "from-magenta-500/20",
      title: "Bot Hunter",
    },
  ];

  return (
    <div className="flex flex-col md:flex-row justify-center items-end gap-8 mb-24 px-4">
      {topTraders.map((trader) => {
        const isFirst = trader.rank === 1;
        const height = isFirst ? "h-[380px]" : "h-[300px]";
        const order = isFirst ? "order-first md:order-2" : trader.rank === 2 ? "order-2 md:order-1" : "order-3 md:order-3";
        const zIndex = isFirst ? "z-30" : "z-20";

        return (
          <div key={trader.rank} className={`relative w-full md:w-1/3 max-w-[320px] ${order} ${zIndex} group perspective-1000`}>
            {/* HOLOGRAPHIC AVATAR SECTION */}
            <div className={`absolute ${isFirst ? "-top-16" : "-top-16"} left-1/2 -translate-x-1/2 flex flex-col items-center z-50 w-full`}>
              {/* Avatar Container */}
              <div className="relative group-hover:scale-110 transition-transform duration-500">
                {/* Rotating Rings */}
                <div className={`absolute inset-[-8px] rounded-full border-2 border-dashed ${trader.borderColor} opacity-30 animate-[spin_10s_linear_infinite]`} />
                <div className={`absolute inset-[-16px] rounded-full border border-dotted ${trader.borderColor} opacity-20 animate-[spin_15s_linear_infinite_reverse]`} />

                {/* Avatar Circle */}
                <div
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#0a0a0a] border-2 ${trader.borderColor} flex items-center justify-center text-5xl md:text-6xl shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                  <span className="relative z-10 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{trader.avatar}</span>
                </div>

                {/* Rank Tag */}
                <div
                  className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-bl-xl rounded-tr-xl bg-black border ${trader.borderColor} text-white text-xs font-black uppercase tracking-widest shadow-lg min-w-[80px] text-center`}
                >
                  #{trader.rank}
                </div>
              </div>
            </div>

            {/* CYBER PEDESTAL */}
            <GlassPanel
              className={`${height} w-full rounded-t-3xl border-t-2 border-x ${trader.borderColor} ${isFirst ? "shadow-[0_0_80px_rgba(234,179,8,0.15)] border-b-0" : "opacity-90 hover:opacity-100 border-b-0"} flex flex-col justify-end pb-8 text-center relative overflow-hidden transition-all duration-500 hover:-translate-y-2`}
            >
              {/* Background Effects */}
              <div className={`absolute inset-0 bg-gradient-to-b ${trader.gradient} to-transparent opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />

              {/* Moving Shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-y-full group-hover:translate-y-[-100%] transition-transform duration-[1.5s]" />

              {/* Pedestal Content */}
              <div className="relative z-10 px-6 pt-16 flex flex-col items-center h-full justify-end">
                {/* Title Badge */}
                <div className={`mb-4 px-3 py-1 bg-white/5 rounded border ${trader.borderColor} border-opacity-30 text-[9px] font-black uppercase tracking-[0.2em] text-gray-300`}>{trader.title}</div>

                {/* Name */}
                <h3 className="text-2xl md:text-3xl font-black italic text-white mb-2 tracking-tighter drop-shadow-lg">{trader.name}</h3>

                {/* Visual Separator */}
                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-2 w-full max-w-[200px]">
                  <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Return</span>
                    <span className={`font-mono font-bold ${isFirst ? "text-yellow-400" : "text-green-400"}`}>{trader.pnl}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Win Rate</span>
                    <span className="font-mono font-bold text-white">{trader.winRate}</span>
                  </div>
                </div>

                {/* Bottom Deco */}
                {isFirst && (
                  <div className="mt-6 flex items-center gap-2 text-yellow-500/50 animate-pulse">
                    <Trophy size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Season Leader</span>
                  </div>
                )}
              </div>
            </GlassPanel>

            {/* Reflection/Ground Glow */}
            <div className={`absolute -bottom-4 left-4 right-4 h-4 bg-gradient-to-r ${trader.gradient} to-transparent blur-xl opacity-50`} />
          </div>
        );
      })}
    </div>
  );
};
