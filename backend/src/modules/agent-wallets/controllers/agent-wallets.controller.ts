import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
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
    description: 'Creates a new agent wallet for the authenticated user. This wallet will be used to trade on their behalf on Drift Protocol.',
  })
  @ApiResponse({ status: 201, description: 'Agent wallet created successfully' })
  @ApiResponse({ status: 409, description: 'User already has an agent wallet' })
  async createAgentWallet(@CurrentUser() user: Payload) {
    return this.agentWalletsService.createAgentWallet(user.id);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get my agent wallet',
    description: 'Returns the agent wallet associated with the authenticated user including current gas balance',
  })
  @ApiResponse({ status: 200, description: 'Agent wallet found' })
  @ApiResponse({ status: 404, description: 'No agent wallet found' })
  async getMyAgentWallet(@CurrentUser() user: Payload) {
    const wallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
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

  @Post('prepare-fund')
  @ApiOperation({
    summary: 'Prepare gas funding transaction',
    description: 'Creates a transaction for user to sign that sends SOL from their wallet to their agent wallet',
  })
  async prepareFundTransaction(
    @CurrentUser() user: Payload,
    @Body() dto: { amount: string },
  ) {
    const wallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
    
    if (!wallet) {
      throw new Error('Agent wallet not found');
    }

    const amountSol = parseFloat(dto.amount);
    if (isNaN(amountSol) || amountSol <= 0) {
      throw new Error('Invalid amount');
    }

    const lamports = Math.floor(amountSol * 1e9);
    const userPublicKey = new PublicKey(user.walletAddress);
    const agentPublicKey = new PublicKey(wallet.publicKey);

    const transferInstruction = SystemProgram.transfer({
      fromPubkey: userPublicKey,
      toPubkey: agentPublicKey,
      lamports,
    });

    const transaction = new Transaction().add(transferInstruction);
    transaction.feePayer = userPublicKey;
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      serializedTransaction: serializedTx.toString('base64'),
      agentWalletAddress: wallet.publicKey,
      amount: amountSol,
      message: 'Sign this transaction to fund your agent wallet with SOL for gas fees',
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

  @Patch(':id/delegate')
  @ApiOperation({
    summary: 'Mark wallet as delegated',
    description: 'Marks the agent wallet as delegated on Drift Protocol',
  })
  @ApiResponse({ status: 200, description: 'Wallet marked as delegated' })
  async markAsDelegated(
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body('subaccountIndex') subaccountIndex: number = 0,
  ) {
    return this.agentWalletsService.markAsDelegated(walletId, subaccountIndex);
  }

  @Patch(':id/revoke')
  @ApiOperation({
    summary: 'Revoke delegation',
    description: 'Revokes the delegation of the agent wallet',
  })
  @ApiResponse({ status: 200, description: 'Delegation revoked' })
  async revokeDelegation(@Param('id', ParseUUIDPipe) walletId: string) {
    return this.agentWalletsService.revokeDelegation(walletId);
  }
}
