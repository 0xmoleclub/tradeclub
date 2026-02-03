import React from "react";
import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface MatchCardProps {
  id?: string;
  p1: string;
  p2: string;
  pnl1: string;
  pnl2: string;
  time: string;
  color?: string;
}

export const MatchCard = ({ id = "1", p1, p2, pnl1, pnl2, time, color = "cyan" }: MatchCardProps) => (
  <Link href={`/match/${id}`}>
    <GlassPanel className="relative rounded-2xl group hover:border-white/20 transition-all duration-300 cursor-pointer" hoverEffect>
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-${color}-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold font-['Rajdhani'] text-white group-hover:text-cyan-400 transition-colors truncate max-w-[100px]">{p1}</span>
            <span className={`text-xs font-mono ${pnl1.startsWith("+") ? "text-green-400" : pnl1.startsWith("-") ? "text-red-400" : "text-gray-400"}`}>{pnl1}</span>
          </div>
          <div className="text-xs font-black italic text-gray-600 mt-2">VS</div>
          <div className="flex flex-col gap-1 items-end">
            <span className="text-lg font-bold font-['Rajdhani'] text-white group-hover:text-magenta-400 transition-colors truncate max-w-[100px]">{p2}</span>
            <span className={`text-xs font-mono ${pnl2.startsWith("+") ? "text-green-400" : pnl2.startsWith("-") ? "text-red-400" : "text-gray-400"}`}>{pnl2}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-gray-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">{time}</span>
          </div>
          <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <Play size={12} fill="currentColor" />
          </button>
        </div>
      </div>
    </GlassPanel>
  </Link>
);
