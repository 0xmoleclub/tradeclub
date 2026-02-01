import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggerService } from '../src/shared/logger/logger.service';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';

// Express app instance for serverless
const server = express();

let cachedApp: express.Express;

async function bootstrap(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      bufferLogs: true,
    },
  );

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // Set up logger
  app.useLogger(logger);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get('app.corsOrigin', '*'),
    credentials: true,
  });

  // Global prefix and versioning
  app.setGlobalPrefix(configService.get('app.apiPrefix', 'api'));
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get('app.apiVersion', 'v1'),
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation (only in dev/non-production if needed)
  if (process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TradeClub API')
      .setDescription('The TradeClub API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.init();
  cachedApp = server;
  
  logger.log('Serverless app initialized', 'Bootstrap');
  
  return cachedApp;
}

// Export for Vercel serverless
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  return app(req, res);
}
