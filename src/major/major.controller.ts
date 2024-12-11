import { Controller, Get, Post } from '@nestjs/common';
import { Major } from '@prisma/client';
import { MajorService } from './major.service';

@Controller('major')
export class MajorController {
  constructor (private majorService: MajorService) {}
  
  @Get()
  async getAllMajor(): Promise<Major[]> {
    return this.majorService.getAllMajor();
  }

}
