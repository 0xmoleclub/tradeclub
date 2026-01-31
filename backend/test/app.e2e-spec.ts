import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET) - should return health status', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      });
  });

  it('/health/liveness (GET) - should return liveness status', () => {
    return request(app.getHttpServer())
      .get('/api/health/liveness')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  describe('Auth (Web3)', () => {
    it('/auth/nonce (GET) - should return nonce for wallet', () => {
      return request(app.getHttpServer())
        .get('/api/auth/nonce?walletAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.nonce).toBeDefined();
          expect(res.body.data.message).toContain('Nonce:');
        });
    });
  });
});
