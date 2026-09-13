import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module.js';
import { MediaModule } from '../media/media.module.js';
import { MediaDeskService } from './media-desk.service.js';
import { MediaDeskController } from './media-desk.controller.js';

@Module({
  imports: [IamModule, MediaModule],
  controllers: [MediaDeskController],
  providers: [MediaDeskService],
})
export class MediaDeskModule {}
