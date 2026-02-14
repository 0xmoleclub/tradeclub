import React, { useState } from "react";
import { RefreshCw, Settings, ChevronDown, ArrowDown, ArrowRightLeft, Zap, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";

export const SwapInterface = () => {
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSwapDirection = () => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);
    // Logic to swap tokens would go here
  };

  return (
    <GlassPanel className="rounded-[2.5rem] p-1 border-t border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="bg-[#050505] rounded-[2.3rem] p-6 md:p-8 relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white tracking-wider flex items-center gap-2">
              <RefreshCw size={20} className="text-cyan-400" />
              Flash<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">Swap</span>
            </h2>
            <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest mt-1">Instant Liquidity Protocol</p>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <Settings size={18} />
          </button>
        </div>

        {/* Sell Section */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-magenta-500/50 to-purple-600/50 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur" />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 transition-colors group-hover:border-magenta-500/30">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">You Sell</span>
              <span className="text-xs font-mono text-gray-500">
                Bal: <span className="text-white font-bold">14.045 ETH</span>
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <input
                type="number"
                placeholder="0.00"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="w-full bg-transparent text-4xl font-mono font-bold text-white placeholder-gray-700 outline-none"
              />
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-2 pr-4 py-1.5 transition-all hover:scale-105 shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-[8px] text-black font-black">ETH</div>
                <span className="font-bold text-sm">ETH</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-xs font-mono text-gray-600">≈ $0.00</div>
              <div className="flex gap-2">
                {["25%", "50%", "MAX"].map((p) => (
                  <button key={p} className="px-2 py-1 bg-magenta-500/10 hover:bg-magenta-500/20 border border-magenta-500/20 rounded text-[9px] font-bold text-magenta-400 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Switcher */}
        <div className="relative h-4 flex items-center justify-center z-10 my-2">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <button
            onClick={handleSwapDirection}
            className={`relative w-10 h-10 bg-[#0a0a0a] border border-white/20 rounded-xl flex items-center justify-center text-white hover:text-cyan-400 hover:border-cyan-400 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] ${isSpinning ? "animate-[spin_0.5s_ease-in-out]" : ""}`}
          >
            <ArrowDown size={18} />
          </button>
        </div>

        {/* Buy Section */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 to-blue-600/50 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur" />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 transition-colors group-hover:border-cyan-500/30">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">You Buy</span>
              <span className="text-xs font-mono text-gray-500">
                Bal: <span className="text-white font-bold">0.00 USDC</span>
              </span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <input
                type="number"
                placeholder="0.00"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full bg-transparent text-4xl font-mono font-bold text-cyan-400 placeholder-gray-700 outline-none"
              />
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-2 pr-4 py-1.5 transition-all hover:scale-105 shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-[8px] text-black font-black">$</div>
                <span className="font-bold text-sm">USDC</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-xs font-mono text-gray-600">≈ $0.00</div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-cyan-500 bg-cyan-900/10 px-2 py-1 rounded border border-cyan-500/20">
                <span>1 ETH = 2,420.50 USDC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Details */}
        <div className="mt-6 space-y-3 px-2">
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-gray-500">
            <span>Rate Impact</span>
            <span className="text-green-400">&lt; 0.01%</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-gray-500">
            <span>Route</span>
            <span className="text-white flex items-center gap-1">
              ETH <ArrowRightLeft size={8} /> CLUB_POOL <ArrowRightLeft size={8} /> USDC
            </span>
          </div>
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-gray-500">
            <span>Network Cost</span>
            <span className="text-white flex items-center gap-1">
              <Zap size={10} className="text-yellow-500" /> $4.20
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <ConnectWalletButton variant="inline" />
        </div>
      </div>
    </GlassPanel>
  );
};
