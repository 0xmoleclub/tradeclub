import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { isAddress } from 'viem';
import { HypercoreWalletsService } from '../services/hypercore-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Payload } from '../../auth/auth.interface';

@ApiTags('Hypercore Wallets')
@Controller('hypercore-wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HypercoreWalletsController {
  constructor(private readonly walletsService: HypercoreWalletsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or replace agent wallet',
    description: `
Creates a new agent wallet or replaces the existing one.

**How it works:**
1. Backend generates new EVM keypair
2. Encrypts private key, stores in DB
3. Returns agentAddress to frontend

**Frontend then:**
1. Call Hyperliquid's ApproveAgent with:
   - agentAddress: returned address
   - name: "trade-club-agent" (fixed)
2. Hyperliquid auto-revokes old agent with same name (if exists)
3. New agent is now active

**Note:** If user already has an approved agent, approving this new one 
with same name "trade-club-agent" automatically revokes the old one.
    `,
  })
  async createOrReplace(
    @CurrentUser() user: Payload,
    @Body('masterAddress') masterAddress: string,
  ) {
    if (!masterAddress || !isAddress(masterAddress, { strict: false })) {
      return {
        success: false,
        message: 'Valid EVM master address (0x...) is required',
      };
    }

    const { agentAddress } = await this.walletsService.createOrReplaceWallet(
      user.id,
      masterAddress,
    );

    return {
      success: true,
      agentAddress,
      agentName: 'trade-club-agent', // Fixed name
      message: 'Use this agentAddress for ApproveAgent transaction on Hyperliquid',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get my agent wallet',
    description: 'Returns agent address if wallet exists',
  })
  async getMyWallet(@CurrentUser() user: Payload) {
    const wallet = await this.walletsService.getWallet(user.id);

    if (!wallet) {
      return {
        hasWallet: false,
        message: 'No agent wallet. Call POST /hypercore-wallets to create one.',
      };
    }

    return {
      hasWallet: true,
      agentAddress: wallet.agentAddress,
      masterAddress: wallet.masterAddress,
      createdAt: wallet.createdAt,
    };
  }
}
