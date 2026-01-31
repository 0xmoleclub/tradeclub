import React from "react";
import { Disc } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative py-20 px-6 bg-black border-t border-white/10">
      <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Disc size={24} className="text-gray-600" />
            <span className="text-xl font-black uppercase tracking-[0.2em] italic text-gray-400">TradeClub</span>
          </div>
          <div className="flex gap-6 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">
            <a href="#" className="hover:text-white transition-colors">
              Manifesto
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="#" className="hover:text-white transition-colors">
              API
            </a>
          </div>
        </div>

        <div className="mt-12 md:mt-0 text-right">
          <div className="text-[10px] font-mono font-bold text-gray-700 uppercase tracking-widest mb-2">System Status</div>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 font-bold uppercase text-sm">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
