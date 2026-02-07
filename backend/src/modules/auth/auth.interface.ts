export interface JwtPayload {
  sub: string;
  walletAddress: string;
  walletType?: 'evm' | 'solana';
}

export interface Payload {
  id: string;
  walletAddress: string;
  walletType?: 'evm' | 'solana';
}
