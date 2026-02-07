import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { isAddress } from 'viem';
import { HyperliquidWalletsService } from '../services/hyperliquid-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Payload } from '../../auth/auth.interface';

@ApiTags('Hyperliquid Wallets')
@Controller('hyperliquid-wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HyperliquidWalletsController {
  constructor(
    private readonly hyperliquidWalletsService: HyperliquidWalletsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Hyperliquid agent wallet',
    description: 
      'Creates a new EVM agent wallet for Hyperliquid trading. ' +
      'Returns the agent address that the user must approve via ApproveAgent transaction.',
  })
  @ApiResponse({ status: 201, description: 'Agent wallet created' })
  @ApiResponse({ status: 409, description: 'User already has an agent wallet' })
  async createAgentWallet(
    @CurrentUser() user: Payload,
    @Body('masterAddress') masterAddress: string,
  ) {
    // Validate master address
    if (!masterAddress || !isAddress(masterAddress, { strict: false })) {
      return {
        success: false,
        message: 'Valid EVM master address is required',
      };
    }

    // Check if wallet already exists
    const existingWallet = await this.hyperliquidWalletsService.getWalletSafe(user.id);
    if (existingWallet) {
      return {
        success: false,
        message: 'Hyperliquid agent wallet already exists',
        wallet: existingWallet,
      };
    }

    // Create the agent wallet
    const wallet = await this.hyperliquidWalletsService.createAgentWallet(
      user.id,
      masterAddress,
    );

    return {
      success: true,
      message: 'Hyperliquid agent wallet created. Next step: Approve this agent on Hyperliquid.',
      wallet: {
        id: wallet.id,
        agentAddress: wallet.agentAddress,
        masterAddress: wallet.masterAddress,
        isApproved: wallet.isApproved,
        subaccountIndex: wallet.subaccountIndex,
        createdAt: wallet.createdAt,
      },
      nextSteps: {
        approveAgent: {
          description: 'Send ApproveAgent transaction from your master wallet',
          action: 'approveAgent',
          params: {
            agentAddress: wallet.agentAddress,
            agentName: null, // or provide a name for named agents
          },
        },
        webhook: 'POST /hyperliquid-wallets/:id/approved (after approval)',
      },
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get my Hyperliquid agent wallet',
    description: 'Returns the agent wallet associated with the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Agent wallet found' })
  async getMyWallet(@CurrentUser() user: Payload) {
    const wallet = await this.hyperliquidWalletsService.getWalletSafe(user.id);
    
    if (!wallet) {
      return { 
        hasWallet: false,
        message: 'No Hyperliquid agent wallet found',
        wallet: null,
      };
    }

    return {
      hasWallet: true,
      wallet,
    };
  }

  @Post(':id/approved')
  @ApiOperation({
    summary: 'Mark agent wallet as approved',
    description: 
      'Called after the user has sent the ApproveAgent transaction on Hyperliquid. ' +
      'This marks the agent as ready for trading.',
  })
  @ApiResponse({ status: 200, description: 'Agent marked as approved' })
  async markAsApproved(
    @CurrentUser() user: Payload,
    @Param('id') walletId: string,
    @Body('agentName') agentName?: string,
  ) {
    const wallet = await this.hyperliquidWalletsService.markAsApproved(
      walletId,
      agentName,
    );

    return {
      success: true,
      message: 'Agent wallet marked as approved',
      wallet: {
        id: wallet.id,
        agentAddress: wallet.agentAddress,
        isApproved: wallet.isApproved,
        approvedAt: wallet.approvedAt,
      },
    };
  }

  @Post(':id/revoke')
  @ApiOperation({
    summary: 'Revoke agent approval',
    description: 
      'Marks the agent as revoked. ' +
      'WARNING: Once revoked on Hyperliquid, this agent address should NOT be reused.',
  })
  @ApiResponse({ status: 200, description: 'Agent approval revoked' })
  async revokeApproval(
    @CurrentUser() user: Payload,
    @Param('id') walletId: string,
  ) {
    const wallet = await this.hyperliquidWalletsService.revokeApproval(walletId);

    return {
      success: true,
      message: 'Agent approval revoked. Generate a new agent wallet for future use.',
      wallet: {
        id: wallet.id,
        agentAddress: wallet.agentAddress,
        isApproved: wallet.isApproved,
        status: wallet.status,
      },
    };
  }

  @Patch(':id/subaccount')
  @ApiOperation({
    summary: 'Update subaccount index',
    description: 'Update which subaccount this agent trades on (0 = master account)',
  })
  @ApiResponse({ status: 200, description: 'Subaccount updated' })
  async updateSubaccount(
    @CurrentUser() user: Payload,
    @Param('id') walletId: string,
    @Body('subaccountIndex') subaccountIndex: number,
  ) {
    if (typeof subaccountIndex !== 'number' || subaccountIndex < 0) {
      return {
        success: false,
        message: 'Valid subaccount index (>= 0) is required',
      };
    }

    const wallet = await this.hyperliquidWalletsService.updateSubaccount(
      walletId,
      subaccountIndex,
    );

    return {
      success: true,
      message: `Subaccount updated to ${subaccountIndex}`,
      wallet: {
        id: wallet.id,
        agentAddress: wallet.agentAddress,
        subaccountIndex: wallet.subaccountIndex,
      },
    };
  }
}
