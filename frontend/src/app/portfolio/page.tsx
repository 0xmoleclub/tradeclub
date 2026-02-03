"use client";

import React from "react";
import { Share2, Download } from "lucide-react";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsDeck } from "@/components/portfolio/StatsDeck";
import { HistoryTerminal } from "@/components/portfolio/HistoryTerminal";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-rajdhani selection:bg-magenta-500/50 overflow-x-hidden flex flex-col">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.2} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader
        title={
          <div className="flex flex-col items-center">
            <span>My Portfolio</span>
          </div>
        }
        backUrl="/"
        rightContent={
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
              <Share2 size={14} /> Share PnL
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {/* MAIN CONTENT */}
      <div className="relative z-10 px-6 max-w-[1400px] mx-auto pb-20 pt-8 w-full">
        <StatsDeck />
        <HistoryTerminal />
      </div>
    </div>
  );
}
