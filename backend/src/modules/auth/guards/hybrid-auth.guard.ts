import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AgentAuthGuard } from './agent-auth.guard';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';

@Injectable()
export class HybridAuthGuard extends JwtAuthGuard {
  constructor(
    reflector: Reflector,
    private agentAuthGuard: AgentAuthGuard,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
