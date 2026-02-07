import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerService } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

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
    defaultVersion: configService.get('app.apiVersion', '1'),
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TradeClub API')
    .setDescription('TradeClub API with EVM wallet authentication and Hyperliquid trading')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('Auth', 'Wallet-based authentication')
    .addTag('Hyperliquid Wallets', 'Agent wallet management for Hyperliquid trading')
    .addTag('Hyperliquid Trading', 'Perpetual trading on Hyperliquid')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || configService.get<number>('app.port', 3002);

  await app.listen(port);

  logger.log(
    `API is running on: http://localhost:${port}/${configService.get('app.apiPrefix', 'api')}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

bootstrap();
