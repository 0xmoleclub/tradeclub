import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
