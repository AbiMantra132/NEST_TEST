import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/:userId')
  async getNotificationsByUserId(@Param('userId') userId: string) {
    return await this.notificationService.getNotificationById(userId);
  }
}
