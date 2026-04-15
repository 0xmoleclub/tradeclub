"use client";

import React from "react";
import { useMyAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent/AgentCard";
import { RegisterAgent } from "@/components/agent/RegisterAgent";

export default function AgentsPage() {
  const { data: agents, isLoading } = useMyAgents();

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black font-rajdhani uppercase tracking-wider text-white mb-2">Agent Hangar</h1>
        <p className="text-gray-500 mb-10">Deploy and manage your autonomous combatants.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <RegisterAgent />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {isLoading && <p className="text-gray-500">Loading agents...</p>}
            {!isLoading && agents?.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-10 text-center">
                <p className="text-gray-400">No agents deployed yet.</p>
              </div>
            )}
            {agents?.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
