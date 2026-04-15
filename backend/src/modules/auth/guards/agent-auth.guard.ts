import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { AgentRegistryService } from '@/modules/agent-registry/services/agent-registry.service';

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(private agentRegistryService: AgentRegistryService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-agent-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing agent API key');
    }

    const agent = await this.agentRegistryService.validateApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid agent API key');
    }

    request.user = {
      id: agent.userId,
      agentId: agent.agentId,
      isAgent: true,
    };

    return true;
  }
}
