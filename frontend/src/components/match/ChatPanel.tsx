import React from "react";
import { MessageSquare, Send } from "lucide-react";

export const ChatPanel = () => (
  <div className="h-full flex flex-col bg-[#050505] border-t border-white/10">
    <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Trollbox</span>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-mono text-green-500">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        420 Online
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {[
        { user: "Whale_Alert", msg: "Huge buy wall on P1!", color: "text-cyan-400" },
        { user: "Rekt_Plebe", msg: "P2 is dumping, rip my bet.", color: "text-magenta-400" },
        { user: "Satoshi_Ghost", msg: "Volatility is spiking.", color: "text-yellow-400" },
        { user: "Anon_User", msg: "Just aped 1k on Joe.", color: "text-gray-400" },
        { user: "System", msg: "*** MULTIPLIER BOOST ACTIVATED ***", color: "text-green-500 font-bold" },
        { user: "Bear_Market", msg: "It's over.", color: "text-red-400" },
      ].map((c, i) => (
        <div key={i} className="text-[11px] font-mono leading-tight">
          <span className={`font-bold ${c.color} mr-2`}>{c.user}:</span>
          <span className="text-gray-300">{c.msg}</span>
        </div>
      ))}
    </div>

    <div className="p-3 border-t border-white/10">
      <div className="relative">
        <input
          type="text"
          placeholder="Send message..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition-colors placeholder-gray-600"
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
          <Send size={14} />
        </button>
      </div>
    </div>
  </div>
);
