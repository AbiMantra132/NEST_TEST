import { Module } from '@nestjs/common';
import { MajorService } from './major.service';
import { MajorController } from './major.controller';

@Module({
  providers: [MajorService],
  controllers: [MajorController]
})
export class MajorModule {}
