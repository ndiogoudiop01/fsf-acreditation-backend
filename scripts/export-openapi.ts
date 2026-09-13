import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module.js';

/**
 * Genere `openapi.json` sans demarrer de serveur HTTP — utilise en CI pour
 * publier le contrat d'API meme si Swagger UI est desactive en production.
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('FSF Accreditation — API')
      .setVersion('1.0')
      .build(),
  );

  writeFileSync('openapi.json', JSON.stringify(document, null, 2));
  console.log('openapi.json genere.');
  await app.close();
}

void main();
