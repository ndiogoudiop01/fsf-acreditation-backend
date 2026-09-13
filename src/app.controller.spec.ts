import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigService } from './config/app-config.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AppConfigService,
          useValue: {
            app: {
              name: 'FSF Accreditation',
              env: 'test',
              isProduction: false,
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it("expose le nom de l'application et le lien vers la documentation", () => {
      expect(appController.getInfo()).toEqual({
        name: 'FSF Accreditation',
        env: 'test',
        docs: '/docs',
      });
    });
  });
});
