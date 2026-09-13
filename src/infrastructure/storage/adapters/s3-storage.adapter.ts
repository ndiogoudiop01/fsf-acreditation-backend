import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfigService } from '../../../config/app-config.service.js';
import type {
  PutObjectInput,
  StoragePort,
} from '../../../shared/kernel/ports/storage.port.js';

/**
 * Adaptateur S3-compatible unique : fonctionne avec MinIO en local/dev et
 * avec S3 (ou tout equivalent : Spaces, OVH, Scaleway) en production, en ne
 * changeant que les variables d'environnement. Voir docs/12-deploiement.md.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort, OnModuleInit {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: AppConfigService) {
    const storage = this.config.storage;
    this.bucket = storage.bucket;
    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      if (this.config.app.isProduction) {
        this.logger.warn(
          `Le bucket "${this.bucket}" est introuvable. En production, il doit etre provisionne par l'infrastructure (IaC), pas par l'application.`,
        );
        return;
      }
      // Confort de developpement uniquement (MinIO local) : on le cree s'il manque.
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(
          `Bucket "${this.bucket}" cree (environnement de developpement).`,
        );
      } catch (creationError) {
        this.logger.error(
          `Impossible de creer le bucket "${this.bucket}".`,
          creationError as Error,
        );
      }
    }
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      {
        expiresIn: expiresInSeconds ?? this.config.storage.presignTtlSeconds,
      },
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
