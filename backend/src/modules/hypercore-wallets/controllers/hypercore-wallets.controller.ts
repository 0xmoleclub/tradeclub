import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HypercoreWalletsService } from '../services/hypercore-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Payload } from '../../auth/auth.interface';

@ApiTags('Hypercore Agent')
@Controller('hypercore/agent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HypercoreWalletsController {
  constructor(private readonly walletsService: HypercoreWalletsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or replace agent wallet',
    description: `
Generates a new EVM agent wallet and returns the public key.

**Backend does:**
1. Generates new EVM keypair
2. Encrypts private key with WALLET_ENCRYPTION_KEY
3. Stores in database linked to authenticated user
4. Returns the agent address (public key)

**Frontend then:**
1. Call Hyperliquid's ApproveAgent with:
   - agentAddress: returned address
   - name: "trade-club-agent" (fixed)
2. Agent is now ready to trade on user's behalf

**Note:** Calling this again generates a new keypair and replaces the old one.
    `,
  })
  async createOrReplace(@CurrentUser() user: Payload) {
    const { agentAddress } = await this.walletsService.createOrReplaceWallet(user.id);

    return {
      success: true,
      agentAddress,
      agentName: 'trade-club-agent',
      message: 'Agent wallet created. Use this agentAddress for ApproveAgent transaction on Hyperliquid.',
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
        message: 'No agent wallet. Call POST /hypercore/agent to create one.',
      };
    }

    return {
      hasWallet: true,
      agentAddress: wallet.agentAddress,
      createdAt: wallet.createdAt,
    };
  }
}
