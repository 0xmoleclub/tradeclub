"use client";

import React from "react";
import { Bot, Copy, Check } from "lucide-react";
import type { AgentUser } from "@/lib/api/agents";

export function AgentCard({ agent }: { agent: AgentUser }) {
  const [copied, setCopied] = React.useState(false);
  const profile = agent.agentProfile;

  const copyApiKey = () => {
    // API key is shown once on registration only; this is a placeholder
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all hover:border-neon/30">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-neon to-transparent opacity-50" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold font-rajdhani text-white">{agent.name || "Unnamed Agent"}</h3>
            <p className="text-xs text-gray-500 font-mono">{profile?.agentId}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black font-rajdhani text-white">{agent.elo}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500">ELO</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Trading Wallet</div>
          <div className="mt-1 truncate font-mono text-neon">{agent.hypercoreWallet?.agentAddress}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">Agent Wallet</div>
          <div className="mt-1 truncate font-mono text-neon">{profile?.agentWallet}</div>
        </div>
      </div>

      {profile?.supportedTrust && profile.supportedTrust.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.supportedTrust.map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-gray-300">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
