import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MajorModule } from './major/major.module';
import { PrismaModule } from './prisma/prisma.module';
import { CompetitionModule } from './competition/competition.module';
import { TeamModule } from './team/team.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { NotificationModule } from './notification/notification.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import * as multer from 'multer';
import * as path from 'path';

@Module({
  imports: [
    MajorModule,
    PrismaModule,
    CompetitionModule,
    TeamModule,
    AuthModule,
    NotificationModule,
    ProfileModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, CloudinaryService],
})

// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer
//       .apply(AuthMiddleware)
//       .exclude(
//         { path: '/auth/login', method: RequestMethod.POST },
//         { path: '/auth/signup', method: RequestMethod.POST },
//       )
//       .forRoutes('*');
//   }
// }
export class AppModule {}