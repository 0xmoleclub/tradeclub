import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import { AgentWalletsService } from '../../drift-agent-wallets/services/agent-wallets.service';

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

interface SwapResult {
  signature: string;
  inputAmount: string;
  outputAmount: string;
}

@Injectable()
export class JupiterService {
  private readonly logger = new Logger(JupiterService.name);
  private readonly connection: Connection;
  private readonly jupiterApiBase: string;
  private readonly usdcMint: string;
  private readonly wsolMint: string;
  private readonly minDepositUsdc: number;

  constructor(
    private configService: ConfigService,
    private agentWalletsService: AgentWalletsService,
  ) {
    const isDevnet = this.configService.get('SOLANA_NETWORK', 'devnet') === 'devnet';
    this.connection = new Connection(
      this.configService.get('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
      'confirmed',
    );
    this.jupiterApiBase = 'https://quote-api.jup.ag/v6';
    
    // Devnet USDC and Wrapped SOL mints
    this.usdcMint = isDevnet
      ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
      : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Mainnet USDC
    
    this.wsolMint = 'So11111111111111111111111111111111111111112'; // Same on both
    
    this.minDepositUsdc = 5; // $5 minimum
  }

  /**
   * Swap SOL to USDC to get exact amount of USDC (for minimum deposit)
   * Uses Jupiter's ExactOut mode to get exactly the USDC amount needed
   */
  async swapSolToExactUsdc(
    walletId: string,
    targetUsdcAmount: number, // e.g., 5 for $5
  ): Promise<SwapResult> {
    const wallet = await this.agentWalletsService.getAgentWalletByPublicKey(walletId);
    if (!wallet) {
      throw new Error('Agent wallet not found');
    }

    // Get secret key and create keypair
    const secretKey = await this.agentWalletsService.getSecretKey(wallet.id);
    const keypair = Keypair.fromSecretKey(secretKey);
    const publicKey = keypair.publicKey;

    // USDC has 6 decimals
    const usdcDecimals = 6;
    const targetUsdcLamports = Math.floor(targetUsdcAmount * Math.pow(10, usdcDecimals));

    this.logger.log(`Swapping SOL to ${targetUsdcAmount} USDC for wallet ${publicKey.toBase58()}`);

    // Get quote for exact output amount
    const quote = await this.getQuoteExactOut(
      this.wsolMint,
      this.usdcMint,
      targetUsdcLamports.toString(),
    );

    // Check if agent wallet has enough SOL
    const solBalance = await this.connection.getBalance(publicKey);
    const requiredSol = BigInt(quote.inAmount) + BigInt(5000000); // Add 0.005 SOL for fees
    
    if (BigInt(solBalance) < requiredSol) {
      const requiredSolUi = Number(quote.inAmount) / 1e9;
      const balanceUi = solBalance / 1e9;
      throw new Error(
        `Insufficient SOL balance. Need ~${requiredSolUi.toFixed(6)} SOL (including fees), have ${balanceUi.toFixed(6)} SOL`,
      );
    }

    // Get swap transaction
    const swapResponse = await this.getSwapTransaction(quote, publicKey.toBase58());
    
    // Deserialize and sign transaction
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapResponse.swapTransaction, 'base64'),
    );
    
    transaction.sign([keypair]);

    // Send transaction
    const signature = await this.connection.sendTransaction(transaction, {
      maxRetries: 3,
      skipPreflight: false,
    });

    // Wait for confirmation
    const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Swap transaction failed: ${confirmation.value.err}`);
    }

    this.logger.log(`Swap successful: ${signature}`);
    
    return {
      signature,
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
    };
  }

  /**
   * Get Jupiter quote for exact output amount
   */
  private async getQuoteExactOut(
    inputMint: string,
    outputMint: string,
    exactOutAmount: string,
  ): Promise<JupiterQuote> {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: exactOutAmount,
      swapMode: 'ExactOut',
      slippageBps: '50', // 0.5% slippage
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
    });

    const response = await fetch(`${this.jupiterApiBase}/quote?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter quote failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get swap transaction from Jupiter
   */
  private async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
  ): Promise<{ swapTransaction: string }> {
    const response = await fetch(`${this.jupiterApiBase}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter swap failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get USDC token account balance for a wallet
   */
  async getUsdcBalance(publicKey: PublicKey): Promise<number> {
    try {
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
      const tokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(this.usdcMint),
        publicKey,
        true,
      );
      
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return Number(accountInfo.value.amount) / Math.pow(10, accountInfo.value.decimals);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get SOL balance for a wallet
   */
  async getSolBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / 1e9;
  }

  getUsdcMint(): string {
    return this.usdcMint;
  }

  getMinDepositUsdc(): number {
    return this.minDepositUsdc;
  }
}
