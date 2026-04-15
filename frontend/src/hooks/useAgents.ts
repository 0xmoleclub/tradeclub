"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyAgents, registerAgent, type RegisterAgentPayload, type RegisterAgentResponse } from "@/lib/api/agents";
import { authApi } from "@/services/trading";

function getToken() {
  if (typeof window === "undefined") return undefined;
  return authApi.getToken() ?? undefined;
}

export function useMyAgents() {
  return useQuery({
    queryKey: ["agents", "mine"],
    queryFn: () => fetchMyAgents(getToken()!),
    enabled: typeof window !== "undefined" && !!authApi.getToken(),
  });
}

export function useRegisterAgent() {
  const qc = useQueryClient();
  return useMutation<RegisterAgentResponse, Error, RegisterAgentPayload>({
    mutationFn: (payload) => registerAgent(payload, getToken()!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents", "mine"] });
    },
  });
}
