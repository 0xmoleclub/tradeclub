import React from "react";
import { Radio, TrendingUp } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useMouseParallax } from "@/hooks/useMouseParallax";

export const HeroSection = () => {
  const parallax = useMouseParallax(40);
  const [barData, setBarData] = React.useState<Array<{ height: number; duration: number }>>([]);

  React.useEffect(() => {
    setBarData(
      Array.from({ length: 40 }, () => ({
        height: Math.random() * 60 + 20,
        duration: 0.5 + Math.random(),
      })),
    );
  }, []);

  return (
    <section className="relative min-h-screen pt-32 flex flex-col items-center justify-center overflow-hidden perspective-1000">
      {/* Cinematic Titles */}
      <div className="relative z-20 text-center mb-12 mix-blend-difference" style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }}>
        {/* Volumetric Night Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

        <div className="inline-flex items-center gap-3 px-6 py-2 border border-neon/50 bg-black/80 backdrop-blur-md mb-6 relative z-10 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-neon"></span>
          </div>
          <span className="text-xs font-bold text-white tracking-[0.3em] uppercase font-rajdhani drop-shadow-md">Live Signal: TRADECLUB_FEED</span>
        </div>

        <h1 className="relative text-8xl md:text-[10rem] font-black uppercase italic leading-[0.85] tracking-tighter text-white z-10">
          <span className="block  drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" data-text="Own The">
            Own The
          </span>
          <span
            className="text-transparent px-12 bg-clip-text bg-gradient-to-r from-[#e08aff] via-white to-[#ccff00]"
            style={{ textShadow: "0 0 20px rgba(208,0,255,0.8), 0 0 50px rgba(208,0,255,0.5)" }}
          >
            Night
          </span>
        </h1>

        <p className="mt-8 text-xl text-gray-400 max-w-2xl mx-auto tracking-wide font-mono border-l-4 border-neon pl-6 text-left md:text-center md:border-l-0 uppercase relative z-10 text-glow-neon">
          Welcome to the cage. Where markets bleed, and every trade is a fight.
        </p>
      </div>

      {/* 3D Tilted Interface Deck ("The Booth") */}
      <div
        className="relative z-10 w-full max-w-6xl mt-12 transition-transform duration-100 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(20deg) rotateY(${parallax.x * 0.05}deg) scale(0.95)`,
          transformStyle: "preserve-3d",
        }}
      >
        <GlassPanel className="p-1 bg-[#111] border-t-2 border-neon shadow-[0_0_50px_rgba(208,0,255,0.1)]">
          <div className="bg-black/90 overflow-hidden relative">
            {/* Deck Header */}
            <div className="h-12 border-b border-white/10 flex items-center justify-between px-8 bg-[#0a0a0a]">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-violence animate-pulse" />
                <div className="w-2 h-2 bg-gray-800" />
                <div className="w-2 h-2 bg-gray-800" />
              </div>
              <div className="text-[10px] font-mono font-bold text-neon uppercase tracking-widest">SYSTEM_OVERRIDE // BPM: 140</div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 p-1 bg-[#111]">
              {/* Left Deck (Market) */}
              <div className="col-span-2 bg-[#050505] p-8 relative overflow-hidden group border-r border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:opacity-100 transition-opacity">
                  <TrendingUp className="text-acid w-24 h-24 opacity-10" />
                </div>

                <div className="flex items-end gap-4 mb-6">
                  <h2 className="text-5xl font-black italic text-white font-rajdhani tracking-tighter">BTC/USD</h2>
                  <span className="text-2xl font-mono text-acid font-bold mb-1 flicker">+4.20%</span>
                </div>

                {/* Simulated Chart Visualizer */}
                <div className="flex items-end gap-0.5 h-32 w-full opacity-60 mix-blend-screen">
                  {barData.length > 0
                    ? barData.map((data, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-neon transition-all duration-75" // Faster, sharper bars
                          style={{
                            height: `${data.height}%`,
                            animation: `equalizer ${data.duration * 0.5}s infinite alternate`, // Faster animation
                            opacity: Math.random() > 0.5 ? 1 : 0.5, // Flicker effect
                          }}
                        />
                      ))
                    : [...Array(40)].map((_, i) => <div key={i} className="flex-1 bg-neon/20" style={{ height: "20%" }} />)}
                </div>
              </div>

              {/* Right Deck (Action) */}
              <div className="bg-[#080808] p-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-600 tracking-widest block mb-2 font-mono">Leverage_Multiplier</label>
                    <div className="flex items-center justify-between bg-[#111] p-2 border border-white/5">
                      <span className="text-xs font-mono text-gray-500">1x</span>
                      <div className="flex-1 mx-4 h-1 bg-gray-800">
                        <div className="w-3/4 h-full bg-violence shadow-[0_0_10px_var(--color-violence)]" />
                      </div>
                      <span className="text-xs font-mono text-violence font-bold">50x</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="py-4 bg-acid/10 border border-acid/50 text-acid font-black uppercase tracking-widest hover:bg-acid hover:text-black transition-all clip-path-polygon">
                      Long
                    </button>
                    <button className="py-4 bg-violence/10 border border-violence/50 text-violence font-black uppercase tracking-widest hover:bg-violence hover:text-black transition-all clip-path-polygon">
                      Short
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-2">
                    <span>BALANCE</span>
                    <span className="text-white">12,420.00 USDC</span>
                  </div>
                  <button className="w-full py-3 bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-neon hover:text-white transition-colors">EXECUTE</button>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
};
