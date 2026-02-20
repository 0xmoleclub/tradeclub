import { NestFactory } from '@nestjs/core';
import { LoggerService } from './shared/logger/logger.service';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const shutdown = async () => {
    try {
      logger.log('Shutting down worker...', 'Worker');
      await app.close();
      process.exit(0);
    } catch (error) {
      logger.error('Worker shutdown failed:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.log('Worker started', 'Worker');
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
