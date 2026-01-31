import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  async check() {
    return this.health.check([]);
  }

  @Get('liveness')
  @Public()
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
