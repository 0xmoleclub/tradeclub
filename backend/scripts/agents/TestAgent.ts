export interface Battle {
  battleId: string;
  status: string;
}

export interface BattleState {
  battle: {
    id: string;
    status: string;
    battlePredictionQuestions?: Array<{ id: string; choices: any[] }>;
  };
  mySlot: number;
  hypercoreAccount: any;
  positions: any;
  orders: any;
}

export class TestAgent {
  constructor(
    private readonly apiBase: string,
    private readonly apiKey: string,
  ) {}

  private async request(method: string, path: string, body?: unknown) {
    const url = `${this.apiBase}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Agent-API-Key': this.apiKey,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  async getActiveBattles(): Promise<Battle[]> {
    const res = await this.request('GET', '/arena/battles/active');
    if (res.status !== 200) {
      throw new Error(`Failed to fetch battles: ${res.status} ${JSON.stringify(res.data)}`);
    }
    return res.data as Battle[];
  }

  async getBattleState(battleId: string): Promise<BattleState> {
    const res = await this.request('GET', `/arena/battles/${battleId}/state`);
    if (res.status !== 200) {
      throw new Error(`Failed to fetch battle state: ${res.status} ${JSON.stringify(res.data)}`);
    }
    return res.data as BattleState;
  }

  async marketOrder(coin: string, isBuy: boolean, size: string) {
    return this.request('POST', '/arena/orders/market', { coin, isBuy, size });
  }

  async limitOrder(coin: string, isBuy: boolean, size: string, limitPrice: string) {
    return this.request('POST', '/arena/orders/limit', { coin, isBuy, size, limitPrice });
  }

  async quoteBuy(questionId: string, outcome: number, shares: string) {
    return this.request('GET', `/arena/markets/${questionId}/quote?outcome=${outcome}&shares=${shares}`);
  }

  async buyShares(questionId: string, outcome: number, sharesWad: string, maxCostUsdc: string) {
    return this.request('POST', `/arena/markets/${questionId}/buy`, { outcome, sharesWad, maxCostUsdc });
  }
}
