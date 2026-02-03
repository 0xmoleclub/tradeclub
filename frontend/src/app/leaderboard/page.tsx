"use client";

import React from "react";
import { User, Share2 } from "lucide-react";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Podium } from "@/components/leaderboard/Podium";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-rajdhani selection:bg-magenta-500/50 overflow-x-hidden flex flex-col">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.2} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader title="Hall of Legends" backUrl="/" className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 px-6 max-w-[1200px] mx-auto pb-20 pt-24 w-full">
        <div className="text-center mb-32">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase text-white tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600">
            Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">Legends</span>
          </h1>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.3em]">The Liquidity Wars</p>
        </div>

        <Podium />

        {/* USER STATS BAR */}
        <div className="mb-12 sticky top-24 z-30">
          <GlassPanel className="rounded-full p-1 border border-white/20">
            <div className="bg-[#0a0a0a] rounded-full px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center">
                  <User size={20} className="text-gray-400" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Your Rank</div>
                  <div className="text-xl font-black italic text-white">#420</div>
                </div>
              </div>

              <div className="flex gap-8 md:gap-16">
                <div className="text-center md:text-left">
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Net PnL</div>
                  <div className="text-lg font-mono font-bold text-green-400">+$12,450</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Win Rate</div>
                  <div className="text-lg font-mono font-bold text-white">54.2%</div>
                </div>
                <div className="text-center md:text-left hidden sm:block">
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Volume</div>
                  <div className="text-lg font-mono font-bold text-gray-300">$1.2M</div>
                </div>
              </div>

              <div className="hidden md:block">
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                  <Share2 size={12} /> Share Stats
                </button>
              </div>
            </div>
          </GlassPanel>
        </div>

        <LeaderboardTable />
      </div>
    </div>
  );
}
