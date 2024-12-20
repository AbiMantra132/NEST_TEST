import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Competition } from '@prisma/client';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Competition service responsible for managing competition-related operations.
 * @class CompetitionService
 * 
 * @description
 * This service provides methods for managing competitions, including:
 * - Competition CRUD operations
 * - Team management
 * - Participant registration
 * - Reimbursement handling
 * 
 * @methods
 * - create: Creates new competition with poster image
 * - findAll: Retrieves all competitions
 * - findOne: Gets specific competition by ID
 * - update: Updates existing competition details
 * - remove: Deletes competition record
 * - joinCompetition: Registers user/team for competition
 * - createTeam: Creates new team for competition
 * - submitReimbursement: Handles reimbursement requests
 * - getTeams: Retrieves all teams in a competition
 * 
 * @throws
 * - BadRequestException: For creation/update failures or invalid operations
 * - NotFoundException: When requested resources aren't found
 * 
 * @requires
 * - PrismaService - Database service
 * - @nestjs/common decorators and exceptions
 * - Competition related DTOs
 * 
 * @remarks
 * Handles complex competition management including team formation,
 * participant registration, and financial reimbursements.
 * Implements comprehensive error handling for database operations.
 */


@Injectable()
export class CompetitionService {
  constructor(private prisma: PrismaService) {}

  async create(imageUrl: string, dto: CreateCompetitionDto): Promise<Competition> {
    try {
      return await this.prisma.competition.create({
        data: {
          ...dto,
          imagePoster: imageUrl,
        },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to create competition: ${error.message}`);
    }
  }

  async findAll(): Promise<Competition[]> {
    try {
      return await this.prisma.competition.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new NotFoundException('Failed to fetch competitions');
    }
  }

  async findOne(id: string): Promise<Competition> {
    try {
      const competition = await this.prisma.competition.findUnique({
        where: { id },
      });
      if (!competition) {
        throw new NotFoundException(`Competition with ID ${id} not found`);
      }
      return competition;
    } catch (error) {
      throw new NotFoundException(`Failed to fetch competition: ${error.message}`);
    }
  }

  async update(imageUrl: string, id: string, dto: UpdateCompetitionDto): Promise<Competition> {
    try {
      return await this.prisma.competition.update({
        where: { id },
        data: {
          ...dto,
          ...(imageUrl && { imagePoster: imageUrl }),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to update competition: ${error.message}`);
    }
  }

  async remove(id: string): Promise<Competition> {
    try {
      return await this.prisma.competition.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Failed to delete competition: ${error.message}`);
    }
  }


  async joinCompetition(id: string, joinDto: { userId: string; teamId?: string }) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const existingParticipant = await this.prisma.competitionParticipant.findFirst({
      where: {
        userId: joinDto.userId,
        competitionId: id,
      },
    });

    if (existingParticipant) {
      throw new BadRequestException('User already joined this competition');
    }

    return await this.prisma.competitionParticipant.create({
      data: {
        userId: joinDto.userId,
        competitionId: id,
        teamId: joinDto.teamId,
      },
    });
  }

  async createTeam(id: string, teamDto: { name: string; leader: string; members?: string[]; maxMembers?: number }) {
    const existingTeam = await this.prisma.team.findFirst({
      where: {
        name: teamDto.name,
        competitionId: id,
      },
    });

    if (existingTeam) {
      throw new BadRequestException('Team name already exists');
    }

    const maxMembers = teamDto.maxMembers || 4;
    const members = teamDto.members || [teamDto.leader];

    if (members.length > maxMembers) {
      throw new BadRequestException('Team size exceeds maximum allowed members');
    }

    return await this.prisma.team.create({
      data: {
        name: teamDto.name,
        leaderId: teamDto.leader,
        competitionId: id,
        members,
        maxMembers,
        openSlots: maxMembers - members.length,
      },
    });
  }

  async submitReimbursement(id: string, reimburseDto: { userId: string; amount: number; description: string }) {
    const participant = await this.prisma.competitionParticipant.findFirst({
      where: {
        userId: reimburseDto.userId,
        competitionId: id,
      },
    });

    if (!participant) {
      throw new BadRequestException('User is not a participant in this competition');
    }

    return await this.prisma.reimbursement.create({
      data: {
        competitionId: id,
        userId: reimburseDto.userId,
        amount: reimburseDto.amount,
        reason: reimburseDto.description,
        status: 'PENDING',
        updatedAt: new Date(),
      },
    });
  }

  async getTeams(id: string) {
    return await this.prisma.team.findMany({
      where: {
        competitionId: id,
      },
    });
  }
}
