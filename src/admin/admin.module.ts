import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CompetitionService } from 'src/competition/competition.service';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '../middleware/auth.middleware';

AuthMiddleware
@Module({
  imports: [PrismaModule],
  providers: [AdminService, CloudinaryService, CompetitionService],
  controllers: [AdminController]
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(AdminController);
  }
}
