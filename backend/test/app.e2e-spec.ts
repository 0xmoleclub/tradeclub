import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
      .expect((res: any) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      });
  });

  it('/health/liveness (GET) - should return liveness status', () => {
    return request(app.getHttpServer())
      .get('/api/health/liveness')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe('ok');
      });
  });

  describe('Auth (Solana)', () => {
    it('/auth/nonce (GET) - should return nonce for Solana wallet', () => {
      return request(app.getHttpServer())
        .get('/api/auth/nonce?walletAddress=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.nonce).toBeDefined();
          expect(res.body.data.message).toContain('Nonce:');
        });
    });
  });
});
