"use client";

import React, { useState } from "react";
import { Search, Filter, Activity, Clock, Trophy, ChevronDown } from "lucide-react";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MatchCarousel } from "@/components/watch-and-predict/MatchCarousel";
import { MatchCard } from "@/components/watch-and-predict/MatchCard";
import { Footer } from "@/components/layout/Footer";
import { PageHeader } from "@/components/layout/PageHeader";

export default function WatchPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-[#050505] text-white font-['Rajdhani'] selection:bg-magenta-500/50 overflow-x-hidden flex flex-col">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.4} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader
        title="Watch Matches"
        backLabel="Back"
        position="fixed"
        rightContent={
          <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Create Match</button>
        }
      />

      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-[1400px] mx-auto flex-1 w-full">
        {/* SEARCH BAR */}
        <div className="flex gap-4 mb-16 max-w-4xl mx-auto">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-black border border-white/10 rounded-lg flex items-center px-4 py-4 focus-within:border-white/30 transition-colors">
              <Search className="text-gray-500 mr-3" size={20} />
              <input
                type="text"
                placeholder="Search Match (Name, Address, ID, Player)"
                className="bg-transparent border-none outline-none text-white w-full font-mono text-sm placeholder-gray-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg flex items-center gap-2 font-bold uppercase tracking-wider text-xs transition-all">
            <Filter size={16} /> Filter
          </button>
        </div>

        {/* 3D CAROUSEL */}
        <MatchCarousel />

        {/* LIVE MATCHES */}
        <div className="relative mb-20">
          <SectionTitle title="Live Matches!!" icon={Activity} color="red" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MatchCard id="live1" p1="Trader_Joe" p2="Trader_Ji" pnl1="+3.2K$" pnl2="+2.3K$" time="LIVE" color="cyan" />
            <MatchCard id="live2" p1="Whale_X" p2="Bear_Killer" pnl1="-1.2K$" pnl2="+5.0K$" time="LIVE" color="magenta" />
            <MatchCard id="live3" p1="Satoshi_Son" p2="Vitalik_Fan" pnl1="+10.5K$" pnl2="-2.1K$" time="LIVE" color="cyan" />
            <MatchCard id="live4" p1="Moon_Boy" p2="Rekt_City" pnl1="-500$" pnl2="-1.2K$" time="LIVE" color="purple" />
          </div>

          <div className="mt-8 flex justify-center">
            <button className="text-xs font-mono font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2">
              Show More <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* UPCOMING MATCHES */}
        <div className="mb-20">
          <SectionTitle title="Upcoming Matches" icon={Clock} color="cyan" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MatchCard id="up1" p1="Neo" p2="Morpheus" pnl1="--" pnl2="--" time="10:00 PM" color="gray" />
            <MatchCard id="up2" p1="Alpha" p2="Omega" pnl1="--" pnl2="--" time="11:30 PM" color="gray" />
            <MatchCard id="up3" p1="Bull" p2="Bear" pnl1="--" pnl2="--" time="TOMORROW" color="gray" />
            <MatchCard id="up4" p1="Moon" p2="Rekt" pnl1="--" pnl2="--" time="TOMORROW" color="gray" />
          </div>

          <div className="mt-8 flex justify-center">
            <button className="text-xs font-mono font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2">
              Show More <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* GLORIOUS BATTLE RESULTS */}
        <div className="mb-20">
          <SectionTitle title="Glorious Battle Results" icon={Trophy} color="yellow" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MatchCard id="hist1" p1="Trader_Joe" p2="Trader_Ji" pnl1="+3.2K$" pnl2="-1.2K$" time="2h ago" color="yellow" />
            <MatchCard id="hist2" p1="Sniper_01" p2="HODLer" pnl1="+500$" pnl2="-500$" time="2h ago" color="yellow" />
            <MatchCard id="hist3" p1="Elon_Musk" p2="Bezos" pnl1="+1M$" pnl2="+500K$" time="4h ago" color="yellow" />
          </div>

          <div className="mt-8 flex justify-center">
            <button className="text-xs font-mono font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2">
              Show More <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
