import React, { useEffect, useRef } from "react";

export const CandleChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Mock Data Generator
    let price = 50000;
    const candles: { open: number; close: number; high: number; low: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const open = price;
      const close = price + (Math.random() - 0.5) * 500;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      candles.push({ open, close, high, low });
      price = close;
    }

    const candleWidth = width / 60;
    const maxPrice = Math.max(...candles.map((c) => c.high));
    const minPrice = Math.min(...candles.map((c) => c.low));
    const priceRange = maxPrice - minPrice;

    // Draw
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = i * candleWidth;
      const isUp = c.close > c.open;
      const color = isUp ? "#06b6d4" : "#d946ef"; // Cyan / Magenta
      const bodyTop = height - ((Math.max(c.open, c.close) - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const bodyBottom = height - ((Math.min(c.open, c.close) - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const wickTop = height - ((c.high - minPrice) / priceRange) * height * 0.8 - height * 0.1;
      const wickBottom = height - ((c.low - minPrice) / priceRange) * height * 0.8 - height * 0.1;

      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, wickTop);
      ctx.lineTo(x + candleWidth / 2, wickBottom);
      ctx.stroke();

      // Body
      const h = Math.max(1, bodyBottom - bodyTop);
      ctx.fillRect(x + 2, bodyTop, candleWidth - 4, h);

      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillRect(x + 2, bodyTop, candleWidth - 4, h);
      ctx.shadowBlur = 0;
    });
  }, []);

  return (
    <div className="w-full h-full relative group cursor-crosshair">
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded border border-white/10">
          <span className="text-xl font-black font-['Rajdhani'] italic text-white">BTC-PERP</span>
          <span className="text-sm font-mono text-cyan-400">$98,420.50</span>
        </div>
        <div className="flex gap-1">
          {["15m", "1h", "4h", "1D"].map((tf) => (
            <button key={tf} className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-white hover:bg-white/10 rounded">
              {tf}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
      {/* Crosshair Lines (CSS) */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 border-t border-dashed border-white/30" />
        <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white/20 border-l border-dashed border-white/30" />
      </div>
    </div>
  );
};
