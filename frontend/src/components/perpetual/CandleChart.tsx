'use client';

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHyperliquidCandles } from "@/hooks/useHyperliquidCandles";
import type { IChartApi, ISeriesApi, LogicalRange, Time, CandlestickData } from "lightweight-charts";

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
  const { candles, isLoading, isLoadingMore, hasMoreData, loadMore } = useHyperliquidCandles(symbol, interval);
  const [mounted, setMounted] = useState(false);
  
  // Chart refs
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const loadedTimeRangeRef = useRef<{ from: number; to: number } | null>(null);
  const isInitialSetDataRef = useRef(true);
  const isLoadingMoreRef = useRef(false);

  // Prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track loading more state in ref for callback access
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

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
          barSpacing: 6,
          minBarSpacing: 2,
        },
        handleScroll: {
          vertTouchDrag: false,
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

      // Infinite scroll handler - detect when user scrolls to left edge
      const handleVisibleRangeChange = (range: LogicalRange | null) => {
        if (!range || !seriesRef.current || isLoadingMoreRef.current) return;

        // If we're near the left edge (first 10 bars visible), load more data
        if (range.from < 10 && hasMoreData && loadedTimeRangeRef.current) {
          const oldestTime = loadedTimeRangeRef.current.from;
          loadMore(oldestTime);
        }
      };

      chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

      // Resize handler
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          const { width, height } = chartContainerRef.current.getBoundingClientRect();
          chartRef.current.applyOptions({ width, height });
        }
      };

      // Use ResizeObserver to handle container size changes
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });

      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current);
      }

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
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
  }, [mounted, hasMoreData, loadMore]);

  // Update data when candles change - SMART UPDATE (no refresh on new ticks)
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    // Map to proper CandlestickData format with Time type
    const data: CandlestickData<Time>[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    if (isInitialSetDataRef.current) {
      // Initial load - set all data and fit content
      seriesRef.current.setData(data);
      isInitialSetDataRef.current = false;
      
      // Only fit content on initial load, not on subsequent updates
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }, 0);
      
      loadedTimeRangeRef.current = { 
        from: candles[0].time, 
        to: candles[candles.length - 1].time 
      };
    } else {
      // Smart update: only update/add new candles without resetting view
      const previousData = loadedTimeRangeRef.current;
      
      if (previousData) {
        // Find new candles that are after our previous newest candle
        const newestPreviousTime = previousData.to;
        const existingOldestTime = previousData.from;
        
        // Check if we loaded more historical data (older candles)
        const newOldestTime = candles[0].time;
        const loadedMoreHistory = newOldestTime < existingOldestTime;
        
        if (loadedMoreHistory) {
          // We loaded more historical data - need to setData but preserve view
          const timeScale = chartRef.current?.timeScale();
          const currentRange = timeScale?.getVisibleLogicalRange();
          const barSpacing = timeScale?.options().barSpacing;
          
          // Calculate how many new candles were added
          const newCandlesCount = data.filter(c => (c.time as number) < existingOldestTime).length;
          
          seriesRef.current.setData(data);
          
          // Restore the view position, adjusted for new candles on the left
          if (currentRange && timeScale && newCandlesCount > 0) {
            // Shift the visible range to account for new candles on the left
            timeScale.setVisibleLogicalRange({
              from: currentRange.from + newCandlesCount,
              to: currentRange.to + newCandlesCount,
            });
            // Restore bar spacing
            if (barSpacing) {
              timeScale.applyOptions({ barSpacing });
            }
          }
          
          loadedTimeRangeRef.current = { from: newOldestTime, to: candles[candles.length - 1].time };
        } else {
          // Normal live update - just update the last candle or add new one
          const lastCandle = data[data.length - 1];
          
          if ((lastCandle.time as number) > newestPreviousTime) {
            // New candle formed - add it
            seriesRef.current.update(lastCandle);
            if (loadedTimeRangeRef.current) {
              loadedTimeRangeRef.current.to = lastCandle.time as number;
            }
          } else if ((lastCandle.time as number) === newestPreviousTime) {
            // Current candle updated - update it
            seriesRef.current.update(lastCandle);
          }
          // Note: series.update() does NOT reset the view!
        }
      }
    }
  }, [candles]);

  // Reset initial load flag when symbol or interval changes
  useEffect(() => {
    isInitialSetDataRef.current = true;
    loadedTimeRangeRef.current = null;
  }, [symbol, interval]);

  // Reset to realtime button handler
  const handleResetView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

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

      {/* Loading indicator for historical data */}
      {isLoadingMore && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 rounded-full border border-white/10">
            <div className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] text-gray-400">Loading history...</span>
          </div>
        </div>
      )}

      {/* Reset view button - shows when user has scrolled */}
      <button
        onClick={handleResetView}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/80 hover:bg-white/10 rounded-lg border border-white/10 text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
      >
        Reset View
      </button>

      {/* Interval Buttons - Bottom Right */}
      <div className="absolute bottom-12 right-4 z-10 flex gap-0.5 bg-black/80 p-1 rounded-lg border border-white/20 backdrop-blur-sm">
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

      {/* Loading overlay for initial load */}
      {isLoading && candles.length === 0 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Loading Chart...</span>
          </div>
        </div>
      )}
    </div>
  );
};
