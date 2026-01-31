import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tradeclub',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
    migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
    migrationsRun: true,
  }),
);
