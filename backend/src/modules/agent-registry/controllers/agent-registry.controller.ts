import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AgentRegistryService } from '../services/agent-registry.service';
import { RegisterAgentDto } from '../dto';

@ApiTags('Agent Registry')
@Controller('agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentRegistryController {
  constructor(private readonly agentRegistryService: AgentRegistryService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new AI agent (ERC-8004)' })
  async register(
    @CurrentUser('id') ownerId: string,
    @Body() dto: RegisterAgentDto,
  ) {
    return this.agentRegistryService.registerAgent(ownerId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my registered agents' })
  async myAgents(@CurrentUser('id') ownerId: string) {
    return this.agentRegistryService.findAgentsByOwner(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by user ID' })
  async getAgent(@Param('id') userId: string) {
    return this.agentRegistryService.findAgentByUserId(userId);
  }
}
