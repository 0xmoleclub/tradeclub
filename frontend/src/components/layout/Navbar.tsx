import React, { useState, useEffect } from "react";
import { VisualizerBar } from "@/components/ui/VisualizerBar";

export const Navbar = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? "bg-black/90 backdrop-blur-xl border-white py-4" : "bg-transparent border-transparent py-8"}`}>
      <div className="max-w-[1800px] mx-auto px-8 flex justify-between items-center">
        {/* Logo Area */}
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black uppercase tracking-[0.2em] italic leading-none group-hover:text-magenta-500 transition-colors">TradeClub</span>
            <span className="text-[10px] font-bold text-gray-400 tracking-[0.4em] uppercase mt-1">Nightlife Protocol</span>
          </div>
        </div>

        {/* Center Menu - Holographic Pills */}
        <div className="hidden lg:flex items-center gap-2 bg-[#1a1a1a]/50 p-1 rounded-full border border-white/10 backdrop-blur-md">
          {[
            { label: "The Floor", active: true },
            { label: "VIP Tables", active: false },
            { label: "Lineup", active: false },
            { label: "Bar", active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`relative px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all overflow-hidden ${
                item.active ? "text-white shadow-[0_0_20px_rgba(219,39,119,0.5)]" : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {item.active && <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 to-magenta-900/80 rounded-full -z-10" />}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Action - Skewed Guest List Button */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <VisualizerBar key={i} color="cyan" delay={i * 0.1} />
            ))}
          </div>
          <button className="px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors skew-x-[-15deg] transform hover:scale-105 active:scale-95 duration-200">
            <span className="skew-x-[15deg] inline-block">Guest List</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
