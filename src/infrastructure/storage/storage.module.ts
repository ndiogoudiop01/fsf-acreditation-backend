import { Global, Module } from '@nestjs/common';
import { STORAGE_PORT } from '../../shared/kernel/ports/storage.port.js';
import { S3StorageAdapter } from './adapters/s3-storage.adapter.js';

@Global()
@Module({
  providers: [{ provide: STORAGE_PORT, useClass: S3StorageAdapter }],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
