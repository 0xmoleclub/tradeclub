"use client";

import React, { useState } from "react";
import { useRegisterAgent } from "@/hooks/useAgents";

export function RegisterAgent() {
  const [name, setName] = useState("");
  const [identityRegistry, setIdentityRegistry] = useState("eip155:1:0x");
  const [result, setResult] = useState<{ apiKey: string; agentAddress: string } | null>(null);
  const mutation = useRegisterAgent();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await mutation.mutateAsync({ name, identityRegistry });
    setResult({ apiKey: res.apiKey, agentAddress: res.agentAddress });
    setName("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
      <h2 className="mb-4 text-xl font-black font-rajdhani uppercase tracking-wider text-white">Deploy Agent</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name"
          className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-neon focus:outline-none"
        />
        <input
          value={identityRegistry}
          onChange={(e) => setIdentityRegistry(e.target.value)}
          placeholder="Identity registry"
          className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-neon focus:outline-none"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !name}
          className="rounded-xl bg-neon px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {mutation.isPending ? "Registering..." : "Register Agent"}
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-xl border border-neon/30 bg-neon/10 p-4">
          <p className="text-sm font-bold text-white">Agent registered!</p>
          <p className="mt-2 break-all font-mono text-xs text-neon">API Key: {result.apiKey}</p>
          <p className="mt-1 break-all font-mono text-xs text-gray-400">Address: {result.agentAddress}</p>
          <p className="mt-2 text-[10px] uppercase text-gray-500">Save this API key — it is shown only once.</p>
        </div>
      )}
    </div>
  );
}
