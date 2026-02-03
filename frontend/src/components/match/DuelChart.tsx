import React, { useEffect, useRef } from "react";
import { User } from "lucide-react";

interface DuelChartProps {
  focusedPlayer: "p1" | "p2" | null;
  setFocusedPlayer: (player: "p1" | "p2" | null) => void;
}

export const DuelChart = ({ focusedPlayer, setFocusedPlayer }: DuelChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle retina/high-DPI displays if we wanted to be fancy, but keeping it simple for now to match style
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Generate Mock Data for 2 Players
    const points = 100;
    const p1Data: number[] = []; // Cyan
    const p2Data: number[] = []; // Magenta
    let y1 = height / 2;
    let y2 = height / 2;

    // Seed consistent random data
    let seed = 1;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < points; i++) {
      y1 += (random() - 0.5) * 15;
      y2 += (random() - 0.5) * 20; // P2 is more volatile
      // Clamp to screen
      y1 = Math.max(20, Math.min(height - 20, y1));
      y2 = Math.max(20, Math.min(height - 20, y2));
      p1Data.push(y1);
      p2Data.push(y2);
    }

    const drawLine = (data: number[], color: string, isFocused: boolean, isDimmed: boolean) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = isFocused ? 4 : 2;
      ctx.globalAlpha = isDimmed ? 0.2 : 1;
      ctx.lineJoin = "round";

      // Shadow for glow
      if (!isDimmed) {
        ctx.shadowBlur = isFocused ? 20 : 10;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }

      data.forEach((y, i) => {
        const x = (i / (points - 1)) * width;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1; // Reset alpha
      ctx.shadowBlur = 0; // Reset shadow
    };

    // Draw Grid
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * height) / 5);
      ctx.lineTo(width, (i * height) / 5);
      ctx.stroke();
    }

    // Determine visual states
    const p1Dimmed = focusedPlayer === "p2";
    const p2Dimmed = focusedPlayer === "p1";

    drawLine(p1Data, "#22d3ee", focusedPlayer === "p1", p1Dimmed); // Cyan
    drawLine(p2Data, "#e879f9", focusedPlayer === "p2", p2Dimmed); // Magenta
  }, [focusedPlayer]); // Re-render when focus changes

  return (
    <div className="h-full flex flex-col relative group">
      {/* Header with Avatars */}
      <div className="absolute top-4 left-0 right-0 z-10 px-8 flex justify-between items-start pointer-events-none">
        {/* Player 1 Avatar (Cyan) */}
        <div
          className={`pointer-events-auto transition-all duration-300 transform ${focusedPlayer === "p1" ? "scale-110" : focusedPlayer === "p2" ? "opacity-40 scale-90" : "opacity-100"}`}
          onMouseEnter={() => setFocusedPlayer("p1")}
          onMouseLeave={() => setFocusedPlayer(null)}
        >
          <div className="flex flex-col items-center gap-2 cursor-pointer">
            <div
              className={`w-16 h-16 rounded-full border-2 bg-black flex items-center justify-center relative ${focusedPlayer === "p1" ? "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]" : "border-cyan-500/30"}`}
            >
              <User size={32} className="text-cyan-400" />
              <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-[10px] font-black px-1.5 rounded">1</div>
            </div>
            <div className="text-center bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <div className="text-xs font-black italic text-white">TRADER_JOE</div>
              <div className="text-[10px] font-mono text-cyan-400 font-bold">+142.5%</div>
            </div>
          </div>
        </div>

        {/* VS Badge */}
        <div className="mt-4">
          <div className="text-4xl font-black italic text-white/10 select-none">VS</div>
        </div>

        {/* Player 2 Avatar (Magenta) */}
        <div
          className={`pointer-events-auto transition-all duration-300 transform ${focusedPlayer === "p2" ? "scale-110" : focusedPlayer === "p1" ? "opacity-40 scale-90" : "opacity-100"}`}
          onMouseEnter={() => setFocusedPlayer("p2")}
          onMouseLeave={() => setFocusedPlayer(null)}
        >
          <div className="flex flex-col items-center gap-2 cursor-pointer">
            <div
              className={`w-16 h-16 rounded-full border-2 bg-black flex items-center justify-center relative ${focusedPlayer === "p2" ? "border-magenta-400 shadow-[0_0_30px_rgba(232,121,249,0.5)]" : "border-magenta-500/30"}`}
            >
              <User size={32} className="text-magenta-400" />
              <div className="absolute -bottom-1 -right-1 bg-magenta-500 text-black text-[10px] font-black px-1.5 rounded">2</div>
            </div>
            <div className="text-center bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <div className="text-xs font-black italic text-white">VOID_WALKER</div>
              <div className="text-[10px] font-mono text-magenta-400 font-bold">-12.8%</div>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Time Scale */}
      <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[9px] font-mono text-gray-600">
        <span>10:00 AM</span>
        <span>11:00 AM</span>
        <span>12:00 PM</span>
        <span>01:00 PM</span>
        <span>LIVE</span>
      </div>
    </div>
  );
};
