import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
  limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
}));
