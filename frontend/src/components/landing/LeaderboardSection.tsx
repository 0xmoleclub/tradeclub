import React from "react";
import { Trophy } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const LeaderboardSection = () => {
  return (
    <section className="relative py-32 px-6 border-t border-white/5 bg-gradient-to-b from-[#0a0a0a] to-black">
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4 sticky top-32 h-fit">
          <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-8 leading-none">
            VIP <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Access</span>
          </h2>
          <p className="text-gray-400 mb-8">Top performers earn protocol revenue share, exclusive NFT badges, and access to the whale lounge.</p>
          <GlassPanel className="rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="text-yellow-400" size={32} />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Current Season Prize</div>
                <div className="text-3xl font-black italic text-white">$250,000</div>
              </div>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 w-[65%]" />
            </div>
            <div className="text-right text-[10px] font-mono text-gray-500 mt-2">Ends in 14 Days</div>
          </GlassPanel>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {[1, 2, 3, 4, 5].map((rank, i) => (
            <div
              key={i}
              className="group relative flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-purple-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-8">
                <div className={`text-4xl font-black italic ${i === 0 ? "text-yellow-400" : "text-gray-600"} w-12`}>{rank}</div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border border-white/10" />
                  <div>
                    <div className="text-lg font-bold uppercase tracking-tight">Crypto_King_{rank}</div>
                    <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest">Syndicate_Alpha</div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Yield</div>
                <div className="text-2xl font-mono font-bold text-green-400">+$142,420</div>
              </div>

              {/* Hover Glow */}
              <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
