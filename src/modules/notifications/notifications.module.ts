import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationTemplatesService } from './notification-templates.service.js';
import { NotificationListener } from './notification.listener.js';
import { AdminNotificationTemplatesController } from './admin-notification-templates.controller.js';

@Module({
  controllers: [AdminNotificationTemplatesController],
  providers: [
    NotificationsService,
    NotificationTemplatesService,
    NotificationListener,
  ],
})
export class NotificationsModule {}
