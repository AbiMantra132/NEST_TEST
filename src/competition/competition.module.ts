import { Module } from '@nestjs/common';
import { CompetitionService } from './competition.service';
import { CompetitionController } from './competition.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Adjust the import path as necessary
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [PrismaModule],
  providers: [CompetitionService, CloudinaryService],
  controllers: [CompetitionController]
})
export class CompetitionModule {}
