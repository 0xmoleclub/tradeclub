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
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Agent Wallets')
@Controller('agent-wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentWalletsController {
  constructor(private readonly agentWalletsService: AgentWalletsService) {}

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
    description: 'Returns the agent wallet associated with the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Agent wallet found' })
  @ApiResponse({ status: 404, description: 'No agent wallet found' })
  async getMyAgentWallet(@CurrentUser() user: Payload) {
    const wallet = await this.agentWalletsService.getAgentWalletByUserId(user.id);
    if (!wallet) {
      return { message: 'No agent wallet found', wallet: null };
    }
    return { wallet };
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
