'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface ApiError extends Error {
  status?: number;
  data?: any;
}

// Helper to make authenticated requests
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('tradeclub_token');
  
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed: ${response.status}`) as ApiError;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ==================== AUTH ====================

export interface AuthNonce {
  nonce: string;
  message: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    evmAddress: string;
    role: string;
    status: string;
  };
}

export const authApi = {
  getNonce: async (walletAddress: string): Promise<AuthNonce> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/nonce?walletAddress=${walletAddress}`);
    if (!response.ok) throw new Error('Failed to get nonce');
    return response.json();
  },

  login: async (walletAddress: string, signature: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature }),
    });
    if (!response.ok) throw new Error('Login failed');
    const data = await response.json();
    // Store token
    localStorage.setItem('tradeclub_token', data.accessToken);
    return data;
  },

  logout: () => {
    localStorage.removeItem('tradeclub_token');
  },

  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tradeclub_token');
  },

  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('tradeclub_token');
  },
};

// ==================== AGENT WALLET ====================

export interface AgentWallet {
  agentAddress: string;
  createdAt: string;
}

export const agentWalletApi = {
  create: async (): Promise<AgentWallet> => {
    return fetchWithAuth('/hypercore/agent', { method: 'POST' });
  },

  get: async (): Promise<AgentWallet | null> => {
    return fetchWithAuth('/hypercore/agent');
  },
};

// ==================== TRADING ====================

export interface MarketOrderRequest {
  coin: string;
  isBuy: boolean;
  size: string;
}

export interface LimitOrderRequest {
  coin: string;
  isBuy: boolean;
  price: string;
  size: string;
  postOnly?: boolean;
}

export interface CloseOrderRequest {
  coin: string;
  size: string;
}

export interface TpSlOrderRequest {
  coin: string;
  isBuy: boolean;  // Same as position direction
  size: string;
  takeProfitPrice?: string;
  takeProfitTrigger?: string;
  stopLossPrice?: string;
  stopLossTrigger?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const tradingApi = {
  // Open position orders
  openMarketOrder: async (order: MarketOrderRequest): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/market/open', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  openLimitOrder: async (order: LimitOrderRequest): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/limit/open', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  // Close position orders
  closeMarketOrder: async (order: CloseOrderRequest): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/market/close', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  closeLimitOrder: async (order: CloseOrderRequest & { price: string; postOnly?: boolean }): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/limit/close', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  // TP/SL orders
  placeTakeProfit: async (order: TpSlOrderRequest): Promise<OrderResponse> => {
    const { coin, isBuy, size, takeProfitPrice, takeProfitTrigger } = order;
    return fetchWithAuth('/hypercore/orders/take-profit', {
      method: 'POST',
      body: JSON.stringify({
        coin,
        isBuy,
        size,
        takeProfitPrice,
        takeProfitTrigger,
      }),
    });
  },

  placeStopLoss: async (order: TpSlOrderRequest): Promise<OrderResponse> => {
    const { coin, isBuy, size, stopLossPrice, stopLossTrigger } = order;
    return fetchWithAuth('/hypercore/orders/stop-loss', {
      method: 'POST',
      body: JSON.stringify({
        coin,
        isBuy,
        size,
        stopLossPrice,
        stopLossTrigger,
      }),
    });
  },

  // Cancel orders
  cancelOrder: async (coin: string, oid: number): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ coin, oid }),
    });
  },

  cancelAllOrders: async (): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/orders/cancel-all', {
      method: 'POST',
    });
  },

  // Leverage
  updateLeverage: async (coin: string, leverage: number): Promise<OrderResponse> => {
    return fetchWithAuth('/hypercore/leverage', {
      method: 'POST',
      body: JSON.stringify({ coin, leverage }),
    });
  },
};
