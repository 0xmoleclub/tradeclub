"use client";

import React from "react";
import { Cpu } from "lucide-react";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-rajdhani selection:bg-magenta-500/50 overflow-x-hidden flex flex-col h-screen">
      {/* BACKGROUND */}
      <LaserBackground intensity={0.2} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

      {/* HEADER */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black italic uppercase text-white tracking-wider">
                Battle <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-magenta-500">Oracle</span>
              </h1>
            </div>
          </div>
        }
        backUrl="/"
        className="shrink-0 bg-black/90 backdrop-blur-xl border-b border-white/10"
        rightContent={
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-gray-400">MODEL_ONLINE</span>
          </div>
        }
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex gap-6 overflow-hidden p-6 max-w-[1400px] mx-auto w-full relative z-10">
        <ChatSidebar />
        <ChatInterface />
      </div>
    </div>
  );
}
