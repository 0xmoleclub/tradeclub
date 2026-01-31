import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
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
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Global prefix and versioning
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api'));
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get('API_VERSION', '1'),
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
    .setDescription('The TradeClub API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT', 3002);
  
  await app.listen(port);
  
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${configService.get('API_PREFIX', 'api')}`,
    'Bootstrap',
  );
  logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

bootstrap();
