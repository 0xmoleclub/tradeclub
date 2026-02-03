"use client";

import React from "react";
import { CheckCircle2, Zap } from "lucide-react";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { PageHeader } from "@/components/layout/PageHeader";
import { SwapInterface } from "@/components/swap/SwapInterface";

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-rajdhani selection:bg-magenta-500/50 overflow-x-hidden flex flex-col">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.2} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader title="Flash Swap" backUrl="/" className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10" />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pb-20 pt-24">
        <div className="w-full max-w-lg relative">
          {/* Decorative Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-magenta-500/20 via-transparent to-cyan-500/20 blur-3xl pointer-events-none rounded-full" />

          <SwapInterface />

          {/* Bottom Trust Indicators */}
          <div className="mt-8 flex justify-center gap-8 opacity-40">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
              <CheckCircle2 size={12} /> Audited
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
              <Zap size={12} /> Zero-Slippage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
