import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AgentRegistryService } from '@/modules/agent-registry/services/agent-registry.service';

@Injectable()
export class AgentApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'agent-api-key',
) {
  constructor(private agentRegistryService: AgentRegistryService) {
    super(
      { header: 'X-Agent-API-Key', prefix: '' },
      true,
      async (apiKey: string, done: (error: any, user?: any) => void) => {
        const agent = await this.agentRegistryService.validateApiKey(apiKey);
        if (!agent) {
          return done(new UnauthorizedException('Invalid agent API key'), false);
        }
        return done(null, {
          id: agent.userId,
          agentId: agent.agentId,
          isAgent: true,
        });
      },
    );
  }
}
