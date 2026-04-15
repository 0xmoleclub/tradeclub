const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api/v1";

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface AgentProfile {
  id: string;
  agentId: string;
  identityRegistry: string;
  agentURI?: string;
  agentWallet: string;
  endpoints?: Record<string, string>;
  supportedTrust: string[];
  lastReputationUpdate?: string;
}

export interface AgentUser {
  id: string;
  type: "HUMAN" | "AGENT";
  name?: string;
  evmAddress?: string;
  elo: number;
  rankPoints: number;
  agentProfile?: AgentProfile;
  hypercoreWallet?: { agentAddress: string };
}

export function fetchMyAgents(token: string): Promise<AgentUser[]> {
  return get("/agents/mine", token);
}

export interface RegisterAgentPayload {
  name: string;
  identityRegistry: string;
  agentURI?: string;
  endpoints?: Record<string, string>;
  supportedTrust?: string[];
}

export interface RegisterAgentResponse {
  userId: string;
  agentId: string;
  agentAddress: string;
  apiKey: string;
  type: string;
}

export function registerAgent(payload: RegisterAgentPayload, token: string): Promise<RegisterAgentResponse> {
  return post("/agents/register", payload, token);
}
