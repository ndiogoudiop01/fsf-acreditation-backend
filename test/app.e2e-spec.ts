import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AppConfigService } from '../src/config/app-config.service.js';
import { configureApp } from '../src/bootstrap/configure-app.js';

/**
 * Necessite Postgres/Redis/MinIO demarres (docker compose up -d postgres
 * redis minio) — comme le reste de la suite e2e, cf. docs/11-hooks-qualite.md.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(AppConfigService));
    await app.init();
  });

  it("GET /api/v1 renvoie les informations de l'application dans l'enveloppe standard", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('name');
    expect(response.body.data).toHaveProperty('env');
  });

  it('GET /health/live repond ok sans authentification', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('GET /api/v1/matches refuse sans permission implicite mais reste public (liste vide ou peuplee)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/matches')
      .expect(200);
    expect(response.body.success).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
