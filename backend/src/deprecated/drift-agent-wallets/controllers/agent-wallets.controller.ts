import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentWalletsService } from '../services/agent-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Payload } from '../../auth/auth.interface';
import { WithdrawGasDto } from '../dto';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';

@ApiTags('Agent Wallets')
@Controller('agent-wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentWalletsController {
  private connection: Connection;

  constructor(
    private readonly agentWalletsService: AgentWalletsService,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL', 'https://api.devnet.solana.com');
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  @Post()
  @ApiOperation({
    summary: 'Create agent wallet',
    description: 'Creates a new agent wallet for the user. Returns the wallet address and (if needed) an unsigned transaction to authorize it as delegate on Drift.',
  })
  @ApiResponse({ status: 201, description: 'Agent wallet created' })
  async createAgentWallet(@CurrentUser() user: Payload) {
    // Check if wallet already exists
    const existingWallet = await this.agentWalletsService.getAgentWalletSafe(user.id);
    if (existingWallet) {
      return {
        success: false,
        message: 'Agent wallet already exists',
        wallet: existingWallet,
      };
    }

    // Create the agent wallet
    const wallet = await this.agentWalletsService.createAgentWallet(user.id);
    
    return {
      success: true,
      message: 'Agent wallet created. Next step: deposit to Drift or set delegate if you have an existing account.',
      wallet: {
        id: wallet.id,
        publicKey: wallet.publicKey,
        isDelegated: wallet.isDelegated,
        createdAt: wallet.createdAt,
      },
      nextSteps: {
        deposit: 'POST /drift/deposit (for new Drift accounts)',
        setDelegate: 'POST /drift/account/set-delegate (for existing Drift accounts)',
      },
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get my agent wallet',
    description: 'Returns the agent wallet associated with the authenticated user including current gas balance',
  })
  @ApiResponse({ status: 200, description: 'Agent wallet found' })
  @ApiResponse({ status: 404, description: 'No agent wallet found' })
  async getMyAgentWallet(@CurrentUser() user: Payload) {
    const wallet = await this.agentWalletsService.getAgentWalletSafe(user.id);
    if (!wallet) {
      return { message: 'No agent wallet found', wallet: null };
    }

    // Get live SOL balance
    const publicKey = new PublicKey(wallet.publicKey);
    const balance = await this.connection.getBalance(publicKey);
    const solBalance = balance / 1e9;

    return { 
      wallet: {
        ...wallet,
        gasBalance: solBalance.toString(),
      },
    };
  }

  @Get('gas-balance')
  @ApiOperation({
    summary: 'Get agent wallet gas balance',
    description: 'Returns the current SOL balance of the agent wallet (live from blockchain)',
  })
  async getGasBalance(@CurrentUser() user: Payload) {
    const wallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
    
    if (!wallet) {
      return {
        hasAgentWallet: false,
        message: 'No agent wallet found',
      };
    }

    const publicKey = new PublicKey(wallet.publicKey);
    const balance = await this.connection.getBalance(publicKey);
    const solBalance = balance / 1e9;

    // Update cached balance in database
    await this.agentWalletsService.updateGasBalance(wallet.id, solBalance.toString());

    return {
      hasAgentWallet: true,
      agentWalletAddress: wallet.publicKey,
      gasBalance: solBalance,
      gasBalanceLamports: balance,
      minRecommended: 0.1,
      hasEnoughGas: solBalance >= 0.01,
    };
  }

  @Post('prepare-withdraw-gas')
  @ApiOperation({
    summary: 'Prepare withdraw gas transaction',
    description: 'Creates a transaction to withdraw SOL from agent wallet back to user wallet. If amount not specified, withdraws all minus rent exemption (0.002 SOL).',
  })
  async prepareWithdrawGasTransaction(
    @CurrentUser() user: Payload,
    @Body() dto: WithdrawGasDto,
  ) {
    const wallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
    
    if (!wallet) {
      throw new Error('Agent wallet not found');
    }

    // Get agent wallet keypair
    const secretKey = await this.agentWalletsService.getSecretKey(wallet.id);
    const agentKeypair = Keypair.fromSecretKey(secretKey);
    const agentPublicKey = agentKeypair.publicKey;
    const userPublicKey = new PublicKey(user.walletAddress);

    // Get current balance
    const balance = await this.connection.getBalance(agentPublicKey);
    
    // Rent exemption buffer (minimum SOL that must stay in account)
    const RENT_EXEMPTION = 890880; // ~0.00089 SOL in lamports
    const MAX_WITHDRAW = balance - RENT_EXEMPTION - 5000; // Leave rent + fee buffer

    if (MAX_WITHDRAW <= 0) {
      throw new Error('Insufficient balance to withdraw (need to keep rent exemption)');
    }

    // Determine withdrawal amount
    let withdrawLamports: number;
    if (dto.amount) {
      const amountSol = parseFloat(dto.amount);
      if (isNaN(amountSol) || amountSol <= 0) {
        throw new Error('Invalid amount');
      }
      withdrawLamports = Math.floor(amountSol * 1e9);
      if (withdrawLamports > MAX_WITHDRAW) {
        throw new Error(`Maximum withdrawable amount is ${(MAX_WITHDRAW / 1e9).toFixed(6)} SOL`);
      }
    } else {
      // Withdraw all available
      withdrawLamports = MAX_WITHDRAW;
    }

    // Create transfer from agent to user
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: agentPublicKey,
      toPubkey: userPublicKey,
      lamports: withdrawLamports,
    });

    const transaction = new Transaction().add(transferInstruction);
    transaction.feePayer = agentPublicKey;
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign with agent wallet (we have the key)
    transaction.sign(agentKeypair);

    const serializedTx = transaction.serialize({
      requireAllSignatures: false, // Still needs to be fully signed
      verifySignatures: false,
    });

    // Actually, since we're the only signer needed, we can return fully signed
    // But let's return unsigned for consistency, frontend can send
    return {
      serializedTransaction: serializedTx.toString('base64'),
      agentWalletAddress: wallet.publicKey,
      recipientAddress: user.walletAddress,
      amount: withdrawLamports / 1e9,
      remainingBalance: (balance - withdrawLamports) / 1e9,
      message: 'Transaction prepared. Send this to withdraw SOL from agent wallet to your wallet',
    };
  }
}
