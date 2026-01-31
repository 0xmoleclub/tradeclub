import { Controller, Get, Version } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
      () =>
        this.disk.checkStorage('disk', {
          thresholdPercent: 0.9, // 90% threshold
          path: '/',
        }),
    ]);
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

  @Get('readiness')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}
