'use client';

import React, { useEffect, useRef, useState } from "react";
import { useHyperliquidCandles } from "@/hooks/useHyperliquidCandles";

interface CandleChartProps {
  symbol?: string;
}

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

export const CandleChart = ({ symbol = "BTC-PERP" }: CandleChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState("15m");
  const { candles } = useHyperliquidCandles(symbol, interval);
  const [mounted, setMounted] = useState(false);
  
  // Chart refs
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  // Prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current || !mounted) return;

    let isActive = true;

    import("lightweight-charts").then((lc) => {
      if (!isActive || !chartContainerRef.current) return;

      const chart = lc.createChart(chartContainerRef.current, {
        layout: {
          background: { color: "transparent" },
          textColor: "#9ca3af",
          fontFamily: "Rajdhani, monospace",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.05)" },
          horzLines: { color: "rgba(255, 255, 255, 0.05)" },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "rgba(255, 255, 255, 0.3)",
            labelBackgroundColor: "rgba(0, 0, 0, 0.8)",
          },
          horzLine: {
            color: "rgba(255, 255, 255, 0.3)",
            labelBackgroundColor: "rgba(0, 0, 0, 0.8)",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: "#06b6d4",
        downColor: "#d946ef",
        borderUpColor: "#06b6d4",
        borderDownColor: "#d946ef",
        wickUpColor: "#06b6d4",
        wickDownColor: "#d946ef",
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Resize handler
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          const { width, height } = chartContainerRef.current.getBoundingClientRect();
          chartRef.current.applyOptions({ width, height });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    });

    return () => {
      isActive = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [mounted]);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    console.log('[Chart] Setting', candles.length, 'candles');

    const data = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(data);
    
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Interval Buttons - Bottom Right */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-0.5 bg-black/80 p-1 rounded-lg border border-white/20 backdrop-blur-sm">
        {INTERVALS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setInterval(tf.value)}
            className={`
              px-2 py-1 text-[10px] font-bold rounded transition-colors
              ${interval === tf.value 
                ? 'bg-cyan-500/30 text-cyan-400' 
                : 'text-gray-500 hover:text-white hover:bg-white/10'
              }
            `}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
};
