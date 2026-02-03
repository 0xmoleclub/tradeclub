import React from "react";
import { Eye } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Swords } from "@/components/ui/Icons";

export const BattleSection = () => {
  return (
    <section className="relative py-32 px-6 bg-grid-pattern">
      {/* Fog Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#000] opacity-80 pointer-events-none" />

      <div className="relative z-10 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div>
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-4 text-white font-rajdhani">
              The <span className="text-neon text-glow-neon">Pit</span>
            </h2>
            <p className="text-gray-500 text-lg border-l-4 border-neon pl-4 font-mono uppercase">Live 1v1 combat. Winner takes the yield.</p>
          </div>

          <div className="flex gap-4">
            <NeonButton icon={Swords} color="violence" href="/perpetual">
              Join Queue
            </NeonButton>
            <NeonButton icon={Eye} color="acid" href="/watch-and-predict">
              Spectate
            </NeonButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3].map((item, i) => (
            <GlassPanel key={i} className="group rounded-none p-0 border border-steel hover:border-neon transition-all duration-300">
              <div className="bg-[#080808] p-8 h-full relative overflow-hidden">
                {/* Background Pulse */}
                <div className="absolute inset-0 bg-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />

                {/* Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 background-size-[100%_2px,3px_100%] pointer-events-none" />

                <div className="flex justify-between items-start mb-12 relative z-20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest mb-1">Corner Red</span>
                    <span className="text-2xl font-black italic text-white font-rajdhani">NEON_KING</span>
                    <span className="text-acid font-mono text-sm font-bold">+142%</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest mb-1">Corner Blue</span>
                    <span className="text-2xl font-black italic text-white font-rajdhani">VOID_WALKER</span>
                    <span className="text-violence font-mono text-sm font-bold">-12%</span>
                  </div>
                </div>

                {/* VS Graphic */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] font-black italic text-white/5 select-none pointer-events-none font-rajdhani">VS</div>

                <div className="relative z-20 pt-8 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-violence animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violence">Live Now</span>
                  </div>
                  <span className="text-xl font-black italic text-white font-rajdhani">$24,000 POT</span>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  );
};
