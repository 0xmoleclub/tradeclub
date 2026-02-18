"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Users, Activity, GripVertical, GripHorizontal } from "lucide-react";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { DuelChart } from "@/components/match/DuelChart";
import { BettingPanel } from "@/components/match/BettingPanel";
import { ChatPanel } from "@/components/match/ChatPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";

export default function MatchPage() {
  const [rightPanelWidth, setRightPanelWidth] = useState(30); // %
  const [chatHeight, setChatHeight] = useState(40); // % height of chat relative to right col
  const [focusedPlayer, setFocusedPlayer] = useState<"p1" | "p2" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"vertical" | "horizontal" | null>(null);

  const handleMouseDown = (type: "vertical" | "horizontal") => (e: React.MouseEvent) => {
    isDragging.current = type;
    document.body.style.cursor = type === "horizontal" ? "row-resize" : "col-resize";
    e.preventDefault();
  };

  const handleMouseUp = () => {
    isDragging.current = null;
    document.body.style.cursor = "default";
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDragging.current === "vertical") {
      const newWidth = ((rect.right - e.clientX) / rect.width) * 100;
      setRightPanelWidth(Math.max(20, Math.min(50, newWidth)));
    } else if (isDragging.current === "horizontal") {
      // Chat height is at bottom of right col
      // We need y position relative to the right column top, but simpler to use rect.bottom
      const newHeight = ((rect.bottom - e.clientY) / rect.height) * 100;
      setChatHeight(Math.max(20, Math.min(70, newHeight)));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white font-['Rajdhani'] selection:bg-magenta-500/50 overflow-hidden flex flex-col">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.3} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader
        title="Match_Room: #8421"
        backUrl="/watch-and-predict"
        backLabel="Exit Arena"
        titleAlignment="left"
        rightContent={
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded border border-white/10">
              <Users size={14} className="text-gray-400" />
              <span className="text-[10px] font-mono font-bold">14,204 Spec</span>
            </div>
            <ConnectWalletButton variant="page" />
          </div>
        }
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-2 overflow-hidden relative z-10" ref={containerRef}>
        <div className="flex h-full gap-1">
          {/* LEFT COLUMN: CHART */}
          <div className="flex flex-col gap-1" style={{ width: `${100 - rightPanelWidth}%` }}>
            <GlassPanel className="flex-1 rounded-l-2xl">
              <DuelChart focusedPlayer={focusedPlayer} setFocusedPlayer={setFocusedPlayer} />
            </GlassPanel>
            {/* Stats Row */}
            <GlassPanel className="h-16 rounded-bl-2xl flex items-center px-6 justify-between border-t border-white/5">
              <div className="flex gap-8">
                <div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase">Total Volume</div>
                  <div className="text-sm font-mono font-bold text-white">$1,240,500</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase">24h Change</div>
                  <div className="text-sm font-mono font-bold text-green-400">+12.4%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
                <Activity size={14} className="text-gray-500" />
                LIVE FEED
              </div>
            </GlassPanel>
          </div>

          {/* VERTICAL SPLITTER */}
          <div className="w-1 bg-black hover:bg-magenta-500/50 cursor-col-resize flex items-center justify-center transition-colors group z-50" onMouseDown={handleMouseDown("vertical")}>
            <GripVertical size={12} className="text-gray-700 group-hover:text-white" />
          </div>

          {/* RIGHT COLUMN: BETTING & CHAT */}
          <div className="flex flex-col gap-1" style={{ width: `${rightPanelWidth}%` }}>
            {/* TOP: BETTING */}
            <GlassPanel className="flex-1 rounded-tr-2xl" style={{ height: `${100 - chatHeight}%` }}>
              <BettingPanel />
            </GlassPanel>

            {/* HORIZONTAL SPLITTER */}
            <div className="h-1 bg-black hover:bg-cyan-500/50 cursor-row-resize flex items-center justify-center transition-colors group z-50" onMouseDown={handleMouseDown("horizontal")}>
              <GripHorizontal size={12} className="text-gray-700 group-hover:text-white" />
            </div>

            {/* BOTTOM: CHAT */}
            <GlassPanel className="rounded-br-2xl" style={{ height: `${chatHeight}%` }}>
              <ChatPanel />
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
