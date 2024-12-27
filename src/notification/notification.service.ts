import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getNotificationById(id: string) {
    try {
      const notification = await this.prisma.notification.findMany({
        where: { receiverId: id },
      });

      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          student_id: true,
          profile: true,
        }
      });

      const sender = await Promise.all(notification.map(async (notif) => {
        return await this.prisma.user.findUnique({
          where: { id: notif.senderId },
          select: {
          id: true,
          name: true,
          student_id: true,
          profile: true,
          }
        });
      }));

      if (!user) {
        throw new Error('Receiver user not found');
      }

      if (!notification) {
        throw new Error('Notification not found');
      }

      return {
        user,
        notifications: notification.map((notif, index) => ({
          ...notif,
          senderUser: sender[index],
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get notification: ${error.message}`);
    }
  }
}