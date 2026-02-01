import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

let server: any;

async function bootstrap() {
  if (server) return server;

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  await app.init();
  server = expressApp;
  return server;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  return app(req, res);
}
