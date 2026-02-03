import React from "react";

interface PlaceOrderProps {
  symbol?: string;
}

export const PlaceOrder = ({ symbol = "BTC-PERP" }: PlaceOrderProps) => (
  <div className="h-full p-6 flex flex-col bg-[#080808] relative overflow-hidden">
    {/* Background Texture */}
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

    <div className="relative z-10 flex flex-col h-full">
      <div className="flex gap-2 mb-6 p-1 bg-black rounded-lg border border-white/10">
        <button className="flex-1 py-2 text-[10px] font-black uppercase bg-white/10 text-white rounded shadow-sm">Limit</button>
        <button className="flex-1 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-white">Market</button>
        <button className="flex-1 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-white">Stop</button>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-widest">
            <span>Price (USD)</span>
            <span className="text-cyan-400 cursor-pointer">Last</span>
          </div>
          <div className="relative group">
            <input
              type="text"
              className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none transition-colors"
              defaultValue="98,420.50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">USD</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-widest">
            <span>Size (BTC)</span>
            <div className="flex gap-2">
              <span className="cursor-pointer hover:text-white">25%</span>
              <span className="cursor-pointer hover:text-white">50%</span>
              <span className="cursor-pointer hover:text-white">75%</span>
              <span className="cursor-pointer hover:text-white">Max</span>
            </div>
          </div>
          <div className="relative group">
            <input
              type="text"
              className="w-full bg-black border border-white/10 rounded p-3 text-sm font-mono text-white focus:border-magenta-500 focus:outline-none transition-colors"
              placeholder="0.00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">BTC</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-widest">
            <span>Leverage</span>
            <span className="text-yellow-500 animate-pulse">20x</span>
          </div>
          <input type="range" min="1" max="100" className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
          <div className="flex justify-between text-[8px] font-mono text-gray-600 mt-2">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>100x</span>
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-lg space-y-2">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-gray-500">Value</span>
            <span className="text-white">0.00 USD</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-gray-500">Margin</span>
            <span className="text-white">0.00 USD</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-gray-500">Liq. Price</span>
            <span className="text-orange-500">--</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <button className="py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded text-black font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          Long
        </button>
        <button className="py-4 bg-gradient-to-r from-magenta-600 to-magenta-500 rounded text-white font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]">
          Short
        </button>
      </div>
    </div>
  </div>
);
