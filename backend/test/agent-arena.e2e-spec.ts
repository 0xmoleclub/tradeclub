jest.mock('@nktkas/hyperliquid', () => ({
  InfoClient: jest.fn().mockImplementation(() => ({
    meta: jest.fn().mockResolvedValue({ universe: [] }),
    l2Book: jest.fn().mockResolvedValue({ levels: [[], []] }),
    allMids: jest.fn().mockResolvedValue({}),
    clearinghouseState: jest.fn().mockResolvedValue({}),
    openOrders: jest.fn().mockResolvedValue([]),
  })),
  ExchangeClient: jest.fn().mockImplementation(() => ({
    order: jest.fn().mockResolvedValue({ status: 'ok', response: { data: {} } }),
    cancel: jest.fn().mockResolvedValue({ status: 'ok' }),
    updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
    twapOrder: jest.fn().mockResolvedValue({ status: 'ok', response: { data: {} } }),
  })),
  HttpTransport: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AgentRegistryService } from './../src/modules/agent-registry/services/agent-registry.service';
import { JwtService } from '@nestjs/jwt';

describe('AgentArena (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService | undefined;
  let agentRegistry: AgentRegistryService | undefined;
  let jwtService: JwtService | undefined;
  let testUser: any;
  let agentApiKey: string;
  let agentUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    agentRegistry = app.get(AgentRegistryService);
    jwtService = app.get(JwtService);

    testUser = await prisma.user.create({
      data: {
        evmAddress: '0x1111111111111111111111111111111111111111',
        name: 'Test Owner',
      },
    });

    const agent = await agentRegistry.registerAgent(testUser.id, {
      name: 'TestBot',
      identityRegistry: 'eip155:1:0x2222222222222222222222222222222222222222',
    });

    agentApiKey = agent.apiKey;
    agentUserId = agent.userId;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.agentProfile.deleteMany({ where: { userId: agentUserId } }).catch(() => {});
      await prisma.hypercoreWallet.deleteMany({ where: { userId: agentUserId } }).catch(() => {});
      await prisma.battlePlayer.deleteMany({ where: { userId: agentUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: [testUser.id, agentUserId] } } }).catch(() => {});
    }
    await app.close();
  });

  describe('/skill.md', () => {
    it('should return markdown with agent instructions', async () => {
      const res = await request(app.getHttpServer())
        .get('/skill.md')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/markdown');
      expect(res.text).toContain('tradeclub-agent');
      expect(res.text).toContain('X-Agent-API-Key');
      expect(res.text).toContain('POST /arena/orders/market');
    });
  });

  describe('Agent Authentication', () => {
    it('should reject arena requests without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/arena/battles/active')
        .expect(401);
    });

    it('should accept arena requests with valid agent API key', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/arena/battles/active')
        .set('X-Agent-API-Key', agentApiKey)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject arena requests with invalid agent API key', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/arena/battles/active')
        .set('X-Agent-API-Key', 'tc_invalidkey')
        .expect(401);
    });

    it('should accept arena requests with valid human JWT', async () => {
      const token = jwtService!.sign({ sub: testUser.id, walletAddress: testUser.evmAddress });
      const res = await request(app.getHttpServer())
        .get('/api/v1/arena/battles/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Arena Trading Guard', () => {
    it('should reject market order when agent has no active battle', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/arena/orders/market')
        .set('X-Agent-API-Key', agentApiKey)
        .send({ coin: 'BTC', isBuy: true, size: '0.1' })
        .expect(403);

      const msg = res.body.message || res.body.data?.message || '';
      expect(msg).toContain('No active battle');
    });

    it('should reject limit order when agent has no active battle', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/arena/orders/limit')
        .set('X-Agent-API-Key', agentApiKey)
        .send({ coin: 'BTC', isBuy: true, size: '0.1', limitPrice: '65000' })
        .expect(403);

      const msg = res.body.message || res.body.data?.message || '';
      expect(msg).toContain('No active battle');
    });
  });
});
