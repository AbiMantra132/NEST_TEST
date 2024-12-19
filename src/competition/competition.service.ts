import { Injectable } from '@nestjs/common';
import { CreateCompetitionDto, FilterCompetitionDto, UpdateCompetitionDto, deleteCompetitionDto } from './dto/index';
import { Competition } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class CompetitionService {
  constructor(private prisma: PrismaService) {}

  async create(url: string, competitionDto: CreateCompetitionDto): Promise<Competition> {
    return await this.prisma.competition.create({
      data : {
        imagePoster: url,
        category: competitionDto.category,
        description: competitionDto.description,
        endDate: competitionDto.endDate,
        level: competitionDto.level,
        linkGuidebook: competitionDto.linkGuidebook,
        linkPendaftaran: competitionDto.linkPendaftaran,
        startDate: competitionDto.startDate,
        title: competitionDto.title,
        type: competitionDto.type
      }      
    });
  }

  async findAll(): Promise<Competition[]> {
    const now = new Date();
    return await this.prisma.competition.findMany({
      where: {
        endDate: {
          gt: now,
        },
      },
    });
  }

  async findOne(id: string): Promise<Competition | null> {
    return await this.prisma.competition.findUnique({
      where: { id },
    });
  }

  async update(url: string, id: string, updateDto: UpdateCompetitionDto): Promise<Competition | null> {
    if(url) {
      updateDto.imagePoster = url;
    }

    return await this.prisma.competition.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string): Promise<Competition | null> {
    return await this.prisma.competition.delete({
      where: { id },
    });
  }
}
