import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface CarouselSlideProps {
  match: {
    id: string;
    p1: string;
    p2: string;
    pot: string;
    p1Score: string;
    p2Score: string;
  };
  isActive: boolean;
}

const CarouselSlide = ({ match, isActive }: CarouselSlideProps) => {
  // Fix Hydration Mismatch: Generate random heights only on client
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    if (isActive) {
      setBars(Array.from({ length: 40 }, () => Math.random() * 60 + 20));
    }
  }, [isActive]);

  return (
    <Link href={`/match/${match.id}`} className="block h-full cursor-pointer">
      <GlassPanel
        className={`h-full rounded-[2rem] transition-all duration-500 flex flex-col relative ${
          isActive ? "border-t border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.15)]" : "border border-white/5 opacity-60"
        }`}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-start border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isActive ? "text-white" : "text-gray-500"}`}>{isActive ? "Live_Feed" : "On_Deck"}</span>
          </div>
          {isActive && <div className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase">Main Stage</div>}
        </div>

        {/* Main Visual */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Animated Graph Background for Active */}
          {isActive && (
            <div className="absolute inset-0 flex items-end gap-1 px-8 pb-0 opacity-20 pointer-events-none">
              {bars.map((height, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500 to-transparent transition-all duration-500" style={{ height: `${height}%` }} />
              ))}
            </div>
          )}

          <div className="relative z-10 w-full px-8 flex items-center justify-between">
            {/* P1 */}
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full border-2 ${isActive ? "border-cyan-500 p-1" : "border-gray-700"} mb-3 transition-all`}>
                <div className="w-full h-full rounded-full bg-cyan-900/20 flex items-center justify-center text-2xl">😎</div>
              </div>
              <div className={`font-black italic ${isActive ? "text-white text-xl" : "text-gray-500 text-lg"}`}>{match.p1}</div>
              <div className={`font-mono text-xs ${isActive ? "text-green-400" : "text-gray-600"}`}>{match.p1Score}</div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <div className={`font-black italic ${isActive ? "text-4xl text-white" : "text-2xl text-gray-700"}`}>VS</div>
              {isActive && <div className="mt-2 text-[10px] font-mono text-cyan-400 bg-cyan-900/20 px-3 py-1 rounded-full border border-cyan-500/30">POT: {match.pot}</div>}
            </div>

            {/* P2 */}
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full border-2 ${isActive ? "border-magenta-500 p-1" : "border-gray-700"} mb-3 transition-all`}>
                <div className="w-full h-full rounded-full bg-magenta-900/20 flex items-center justify-center text-2xl">😈</div>
              </div>
              <div className={`font-black italic ${isActive ? "text-white text-xl" : "text-gray-500 text-lg"}`}>{match.p2}</div>
              <div className={`font-mono text-xs ${isActive ? "text-red-400" : "text-gray-600"}`}>{match.p2Score}</div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
};

export const MatchCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(1);
  const matches = [
    { id: "101", p1: "Whale_X", p2: "Bear_Killer", pot: "$12K", p1Score: "+80%", p2Score: "-10%" },
    { id: "102", p1: "TRADER_JOE", p2: "TRADER_JI", pot: "$50K", p1Score: "+142%", p2Score: "-12%" },
    { id: "103", p1: "Satoshi_Son", p2: "Vitalik_Fan", pot: "$25K", p1Score: "+10%", p2Score: "-2%" },
  ];

  const next = () => setActiveIndex((prev) => (prev + 1) % matches.length);
  const prev = () => setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);

  return (
    <div className="relative w-full max-w-[1400px] mx-auto h-[400px] flex items-center justify-center mb-24 perspective-1000">
      {/* Navigation Buttons */}
      <button
        onClick={prev}
        className="absolute left-4 lg:left-0 z-40 w-12 h-12 rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-cyan-400 hover:border-cyan-400/50 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 lg:right-0 z-40 w-12 h-12 rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-cyan-400 hover:border-cyan-400/50 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110"
      >
        <ChevronRight size={24} />
      </button>

      {/* Carousel Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {matches.map((match, i) => {
          let position = "hidden";
          if (i === activeIndex) position = "center";
          else if (i === (activeIndex - 1 + matches.length) % matches.length) position = "left";
          else if (i === (activeIndex + 1) % matches.length) position = "right";

          if (position === "hidden") return null;

          const isCenter = position === "center";

          return (
            <div
              key={i}
              className={`absolute transition-all duration-700 ease-out 
                 ${isCenter ? "z-30 w-[85%] md:w-[60%] h-[320px] md:h-[380px] opacity-100 scale-100" : "z-10 w-[40%] h-[280px] opacity-30 scale-90 blur-[1px] grayscale"}
                 ${position === "left" ? "-translate-x-[60%] md:-translate-x-[55%]" : position === "right" ? "translate-x-[60%] md:translate-x-[55%]" : "translate-x-0"}
               `}
              onClick={() => setActiveIndex(i)}
            >
              <CarouselSlide match={match} isActive={isCenter} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
