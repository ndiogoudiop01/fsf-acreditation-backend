import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaFacade, REQUESTER_PROFILES_FACADE } from './media.facade.js';
import { MediaController } from './media.controller.js';
import { AdminMediaController } from './admin-media.controller.js';
import { RequestersController } from './requesters.controller.js';

@Module({
  controllers: [MediaController, AdminMediaController, RequestersController],
  providers: [
    MediaService,
    MediaFacade,
    { provide: REQUESTER_PROFILES_FACADE, useExisting: MediaFacade },
  ],
  exports: [REQUESTER_PROFILES_FACADE],
})
export class MediaModule {}
