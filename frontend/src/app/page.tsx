"use client";

import React from "react";
import { LaserBackground } from "@/components/ui/LaserBackground";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { BattleSection } from "@/components/landing/BattleSection";
import { LeaderboardSection } from "@/components/landing/LeaderboardSection";
import { Footer } from "@/components/layout/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-['Rajdhani'] selection:bg-magenta-500/50 overflow-x-hidden">
      {/* BACKGROUND LAYER */}
      <LaserBackground />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* NAVIGATION */}
      <Navbar />

      {/* HERO SECTION: THE DJ BOOTH */}
      <HeroSection />

      {/* SECTION: THE DANCE FLOOR (LIVE BATTLES) */}
      <BattleSection />

      {/* SECTION: VIP LOUNGE (LEADERBOARD) */}
      <LeaderboardSection />

      {/* FOOTER: THE CLUB EXIT */}
      <Footer />
    </div>
  );
}
