"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, GripVertical } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { CandleChart } from "@/components/perpetual/CandleChart";
import { OrderBook } from "@/components/perpetual/OrderBook";
import { TradeHistory } from "@/components/perpetual/TradeHistory";
import { PlaceOrder } from "@/components/perpetual/PlaceOrder";

export default function PerpetualPage() {
  // --- Resizable Grid Logic ---
  const containerRef = useRef<HTMLDivElement>(null);

  // Percentages for splitters
  const [rightPanelWidth, setRightPanelWidth] = useState(25); // % width of right panel
  const [bottomRowHeight, setBottomRowHeight] = useState(30); // % height of bottom row (History)
  const [chartWidth, setChartWidth] = useState(70); // % width of chart vs orderbook

  const isDragging = useRef<"right" | "bottom" | "chart" | null>(null);

  const handleMouseDown = (type: "right" | "bottom" | "chart") => (e: React.MouseEvent) => {
    isDragging.current = type;
    document.body.style.cursor = type === "bottom" ? "row-resize" : "col-resize";
    e.preventDefault();
  };

  const handleMouseUp = () => {
    isDragging.current = null;
    document.body.style.cursor = "default";
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDragging.current === "right") {
        const newWidth = ((rect.right - e.clientX) / rect.width) * 100;
        setRightPanelWidth(Math.max(15, Math.min(40, newWidth)));
      } else if (isDragging.current === "bottom") {
        const newHeight = ((rect.bottom - e.clientY) / rect.height) * 100;
        setBottomRowHeight(Math.max(15, Math.min(50, newHeight)));
      } else if (isDragging.current === "chart") {
        const leftColWidth = rect.width * (1 - rightPanelWidth / 100);
        const newChartW = ((e.clientX - rect.left) / leftColWidth) * 100;
        setChartWidth(Math.max(40, Math.min(80, newChartW)));
      }
    },
    [rightPanelWidth],
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#050505] text-white font-['Rajdhani'] selection:bg-magenta-500/50 overflow-hidden flex flex-col z-50">
      {/* Background Layer (Dimmed for readability) */}
      <LaserBackground intensity={0.3} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 w-full h-screen flex flex-col pt-4 pb-2 px-2 relative z-10" ref={containerRef}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-2 px-2">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Floor</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-gray-400">NETWORK_LIVE: 14ms</span>
          </div>
        </div>

        {/* Resizable Layout */}
        <div className="flex-1 flex gap-1 overflow-hidden">
          {/* LEFT COLUMN (Chart + Orderbook + History) */}
          <div className="flex flex-col gap-1" style={{ width: `${100 - rightPanelWidth}%` }}>
            {/* Top Row (Chart + Orderbook) */}
            <div className="flex flex-1 gap-1" style={{ height: `${100 - bottomRowHeight}%` }}>
              {/* Chart Panel */}
              <GlassPanel style={{ width: `${chartWidth}%` }} className="rounded-tl-2xl">
                <CandleChart />
              </GlassPanel>

              {/* Splitter Chart/OB */}
              <div className="w-1 bg-black hover:bg-magenta-500/50 cursor-col-resize flex items-center justify-center transition-colors" onMouseDown={handleMouseDown("chart")}>
                <div className="h-8 w-[2px] bg-white/20 rounded-full" />
              </div>

              {/* Orderbook Panel */}
              <GlassPanel className="flex-1">
                <div className="h-full flex flex-col">
                  <div className="px-3 py-2 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Orderbook</span>
                    <MoreHorizontal size={14} className="text-gray-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <OrderBook />
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Splitter Top/Bottom */}
            <div className="h-1 bg-black hover:bg-cyan-500/50 cursor-row-resize flex items-center justify-center transition-colors" onMouseDown={handleMouseDown("bottom")}>
              <div className="w-16 h-[2px] bg-white/20 rounded-full" />
            </div>

            {/* Bottom Row (History) */}
            <GlassPanel className="rounded-bl-2xl" style={{ height: `${bottomRowHeight}%` }}>
              <TradeHistory />
            </GlassPanel>
          </div>

          {/* Splitter Left/Right */}
          <div className="w-1 bg-black hover:bg-purple-500/50 cursor-col-resize flex items-center justify-center transition-colors group" onMouseDown={handleMouseDown("right")}>
            <GripVertical size={16} className="text-white/20 group-hover:text-purple-400" />
          </div>

          {/* RIGHT COLUMN (Place Order) */}
          <GlassPanel className="rounded-r-2xl" style={{ width: `${rightPanelWidth}%` }}>
            <PlaceOrder />
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
