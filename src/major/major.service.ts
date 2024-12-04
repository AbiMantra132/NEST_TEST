import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Major } from '@prisma/client';

@Injectable()
export class MajorService {
  constructor (private prisma: PrismaService) {}
  
  async getAllMajor(): Promise<Major[]> {
    return this.prisma.major.findMany();
  } 
}
