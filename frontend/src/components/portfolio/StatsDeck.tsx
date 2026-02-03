import React from "react";
import { Wallet, TrendingUp, ArrowUpRight } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const StatsDeck = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* Main Balance */}
      <GlassPanel className="lg:col-span-7 p-8 rounded-3xl relative group flex flex-col justify-between min-h-[240px]">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <Wallet size={80} className="text-white" />
        </div>

        <div>
          <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-4">Total Equity</div>
          <div className="flex items-baseline gap-4">
            <div className="text-6xl md:text-7xl font-black font-rajdhani text-white tracking-tight">
              $24,420<span className="text-gray-600 text-4xl">.50</span>
            </div>
            <div className="flex items-center gap-1 text-green-400 font-mono text-sm font-bold bg-green-500/10 px-2 py-1 rounded">
              <ArrowUpRight size={14} /> +12.4%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
          <div>
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Available</div>
            <div className="text-lg font-mono text-white">$4,200.00</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">In Orders</div>
            <div className="text-lg font-mono text-white">$12,000.00</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Unrealized PnL</div>
            <div className="text-lg font-mono text-green-400">+$8,220.50</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Margin Usage</div>
            <div className="text-lg font-mono text-yellow-500">42.5%</div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />
      </GlassPanel>

      {/* Performance Card */}
      <GlassPanel className="lg:col-span-5 p-8 rounded-3xl relative group flex flex-col justify-center">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
          <TrendingUp size={80} className="text-magenta-500" />
        </div>

        <div className="text-[10px] font-mono font-bold text-magenta-500 uppercase tracking-widest mb-4">Win Rate Analytics</div>

        <div className="flex items-end gap-2 mb-6">
          <div className="text-6xl font-black font-rajdhani text-white">
            68<span className="text-magenta-500">%</span>
          </div>
          <div className="text-xs font-mono text-gray-400 mb-2">/ Last 30 Days</div>
        </div>

        {/* Mini Bar Chart */}
        <div className="flex items-end gap-1 h-24 w-full">
          {[65, 40, 75, 55, 80, 45, 90, 35, 70, 60, 85, 50, 95, 30, 75, 60, 85, 40, 80, 55].map((height, i) => {
            const isWin = height > 50;
            return <div key={i} className={`flex-1 rounded-t-sm transition-all duration-500 hover:opacity-100 opacity-60 ${isWin ? "bg-cyan-500" : "bg-red-500"}`} style={{ height: `${height}%` }} />;
          })}
        </div>

        <div className="flex justify-between mt-4 text-[9px] font-mono text-gray-500 uppercase">
          <span>30 Days Ago</span>
          <span>Today</span>
        </div>
      </GlassPanel>
    </div>
  );
};
