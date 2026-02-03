import React, { useState } from "react";
import { History, Search, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const HistoryTerminal = () => {
  const [activeTab, setActiveTab] = useState("match"); // 'match', 'perp', 'predict'

  // Mock Data Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <GlassPanel className="rounded-3xl min-h-[600px] flex flex-col">
      {/* Toolbar */}
      <div className="p-6 border-b border-white/10 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">
            <History size={20} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-white tracking-wide">Ledger</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Search */}
          <div className="relative group flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search ID..."
              className="w-full sm:w-48 bg-black/40 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-md overflow-x-auto">
            {[
              { id: "match", label: "Matches" },
              { id: "predict", label: "Predictions" },
              { id: "perp", label: "Perpetuals" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-gray-500 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02]">
              {activeTab === "match" && (
                <>
                  <th className="p-5 pl-8">Match ID</th>
                  <th className="p-5">Opponent</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Duration</th>
                  <th className="p-5 text-right pr-8">Net PnL</th>
                </>
              )}
              {activeTab === "predict" && (
                <>
                  <th className="p-5 pl-8">Event</th>
                  <th className="p-5">Selection</th>
                  <th className="p-5">Wager</th>
                  <th className="p-5">Multiplier</th>
                  <th className="p-5 text-right pr-8">Payout</th>
                </>
              )}
              {activeTab === "perp" && (
                <>
                  <th className="p-5 pl-8">Instrument</th>
                  <th className="p-5">Side</th>
                  <th className="p-5">Leverage</th>
                  <th className="p-5">Entry Price</th>
                  <th className="p-5 text-right pr-8">Realized PnL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {/* MATCH DATA */}
            {activeTab === "match" &&
              [...Array(8)].map((_, i) => {
                const isWin = i % 2 === 0;
                return (
                  <tr key={i} className="hover:bg-white/5 border-b border-white/[0.02] transition-colors group">
                    <td className="p-5 pl-8 text-gray-400 group-hover:text-white transition-colors">#842{i}9A</td>
                    <td className="p-5 font-bold text-white flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-[8px]">{isWin ? "🤡" : "💀"}</div>
                      REKT_KING_{i}
                    </td>
                    <td className="p-5">
                      <div
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded ${isWin ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
                      >
                        {isWin ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span className="font-bold text-[9px]">{isWin ? "VICTORY" : "DEFEATED"}</span>
                      </div>
                    </td>
                    <td className="p-5 text-gray-500">12m 30s</td>
                    <td className={`p-5 pr-8 text-right font-bold text-sm ${isWin ? "text-green-400" : "text-red-400"}`}>
                      {isWin ? "+" : "-"}
                      {formatCurrency(isWin ? 1200 : 500)}
                    </td>
                  </tr>
                );
              })}

            {/* PREDICT DATA */}
            {activeTab === "predict" &&
              [...Array(8)].map((_, i) => {
                const isWin = i % 3 === 0;
                return (
                  <tr key={i} className="hover:bg-white/5 border-b border-white/[0.02] transition-colors group">
                    <td className="p-5 pl-8 text-white font-bold">
                      Trader Joe <span className="text-gray-600 mx-2">vs</span> Void Walker
                    </td>
                    <td className="p-5 text-magenta-400">Trader Joe</td>
                    <td className="p-5 text-gray-400">$100.00</td>
                    <td className="p-5 text-yellow-400 font-bold">2.45x</td>
                    <td className={`p-5 pr-8 text-right font-bold text-sm ${isWin ? "text-green-400" : "text-gray-600"}`}>{isWin ? formatCurrency(245) : "$0.00"}</td>
                  </tr>
                );
              })}

            {/* PERP DATA */}
            {activeTab === "perp" &&
              [...Array(8)].map((_, i) => {
                const isLong = i % 2 === 0;
                const isProfit = i % 3 !== 0;
                return (
                  <tr key={i} className="hover:bg-white/5 border-b border-white/[0.02] transition-colors group">
                    <td className="p-5 pl-8 font-black text-white">BTC-PERP</td>
                    <td className={`p-5 font-bold ${isLong ? "text-green-400" : "text-red-400"}`}>{isLong ? "LONG" : "SHORT"}</td>
                    <td className="p-5">
                      <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">50x</span>
                    </td>
                    <td className="p-5 text-gray-400">$94,240.00</td>
                    <td className={`p-5 pr-8 text-right font-bold text-sm ${isProfit ? "text-green-400" : "text-red-400"}`}>
                      {isProfit ? "+" : "-"}
                      {formatCurrency(isProfit ? 4200 : 1200)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 border-t border-white/5 flex justify-center">
        <button className="text-[10px] font-mono font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
          Load More Records <ChevronDown size={14} />
        </button>
      </div>
    </GlassPanel>
  );
};
