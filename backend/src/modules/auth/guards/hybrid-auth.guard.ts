import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AgentAuthGuard } from './agent-auth.guard';

@Injectable()
export class HybridAuthGuard extends JwtAuthGuard {
  constructor(
    reflector: any,
    private agentAuthGuard: AgentAuthGuard,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      // JWT failed, try agent API key
    }

    try {
      return await this.agentAuthGuard.canActivate(context);
    } catch {
      throw new UnauthorizedException('Valid JWT token or agent API key required');
    }
  }
}
