import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  Competition,
  Team,
  Reimbursement,
  CompetitionParticipant,
  User,
} from '@prisma/client';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StatusDTO } from './dto';

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

  async create(
    imageUrl: string,
    dto: CreateCompetitionDto,
  ): Promise<Competition> {
    try {
      return await this.prisma.competition.create({
        data: {
          ...dto,
          imagePoster: imageUrl,
        },  
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to create competition: ${error.message}`,
      );
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
      throw new NotFoundException(
        `Failed to fetch competition: ${error.message}`,
      );
    }
  }

  async update(
    imageUrl: string,
    id: string,
    dto: UpdateCompetitionDto,
  ): Promise<Competition> {
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
      throw new BadRequestException(
        `Failed to update competition: ${error.message}`,
      );
    }
  }

  async remove(id: string): Promise<Competition> {
    try {
      return await this.prisma.competition.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(
        `Failed to delete competition: ${error.message}`,
      );
    }
  }

  async joinCompetition(
    id: string,
    joinDto: { userId: string; teamId?: string },
  ): Promise<CompetitionParticipant> {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const existingParticipant =
      await this.prisma.competitionParticipant.findFirst({
        where: {
          userId: joinDto.userId,
          competitionId: id,
        },
      });

    if (existingParticipant) {
      throw new BadRequestException('User already joined this competition');
    }

    await this.prisma.history.create({
      data: {
        competitionId: id,
        status: 'pending',
        isWinner: false,
      },
    });

    return await this.prisma.competitionParticipant.create({
      data: {
        userId: joinDto.userId,
        competitionId: id,
        teamId: joinDto?.teamId,
        resultId: null,
        reimburseStatus: null,
        isLeader: false,
      },
    });
  }

  async createTeam(
    id: string,
    teamDto: {
      name: string;
      leaderId: string;
      members?: string[];
      description: string;
      endDate: Date;
      openSlots: number;
      phone: string;
    },
  ): Promise<any> {
    const existingTeam = await this.prisma.team.findFirst({
      where: {
        name: teamDto.name,
        competitionId: id,
      },
    });

    if (existingTeam) {
      throw new BadRequestException('Team with this name already exists');
    }

    const members = await this.prisma.user.findMany({
      where: { id: teamDto.leaderId },
      select: {
        id: true,
      },
    });

    if (members.length > teamDto.openSlots) {
      throw new BadRequestException(
        'Team size exceeds maximum allowed members',
      );
    }

    // find current members
    const currentMembersCount = await this.prisma.competitionParticipant.count({
      where: { competitionId: id, userId: teamDto.leaderId },
    });

    const team = await this.prisma.team.create({
      data: {
        name: teamDto.name,
        leaderId: teamDto.leaderId,
        competitionId: id,
        members: members.map((member) => member.id),
        description: teamDto.description,
        maxMembers: teamDto.openSlots + 1,
        endDate: teamDto.endDate,
        openSlots: teamDto.openSlots + 1 - currentMembersCount,
        status: 'ACTIVE',
        phone: teamDto.phone
      },
      select: {
        id: true,
        name: true,
        openSlots: true,
        description: true,
      },
    });

    await this.prisma.competitionParticipant.updateMany({
      where: {
        userId: teamDto.leaderId,
        competitionId: id,
      },
      data: {
        teamId: team.id,
        isLeader: true,
      },
    });

    const leader = await this.prisma.user.findUnique({
      where: { id: teamDto.leaderId },
      select: { id: true, name: true, profile: true, student_id: true },
    });

    await this.prisma.competitionResult.create({
      data: {
      competitionId: id,
      userId: teamDto.leaderId,
      statusUrl: '',
      evidenceUrl: '',
      updatedAt: new Date(),
      },
    });

    return { team: team, leader: leader };
  }

  async submitReimbursement(
    id: string,
    reimburseDto: {
      userId: string;
      name: string;
      bank: string;
      cardnumber: string;
    },
    url: string,
  ): Promise<Reimbursement> {
    const participant = await this.prisma.competitionParticipant.findFirst({
      where: {
        userId: reimburseDto.userId,
        competitionId: id,
      },
    });

    if (!participant) {
      throw new BadRequestException(
        'User is not a participant in this competition',
      );
    }

    return await this.prisma.reimbursement.create({
      data: {
        competitionId: id,
        userId: reimburseDto.userId,
        receiptUrl: url,
        cardNumber: reimburseDto.cardnumber,
        name: reimburseDto.name,
        status: 'PENDING',
        updatedAt: new Date(),
        bankName: reimburseDto.bank,
      },
    });
  }

  async verifyReimbursement(
    id: string,
    status: string,
  ): Promise<{ id: string; status: string }> {
    const reimbursement = await this.prisma.reimbursement.findFirst({
      where: { competitionId: id },
    });

    if (!reimbursement) {
      throw new NotFoundException('Reimbursement request not found');
    }

    return await this.prisma.reimbursement.update({
      where: {
        id: reimbursement.id,
      },
      data: {
        status: status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async getTeams(id: string) {
    const teamData = await this.prisma.team.findMany({
      where: {
        competitionId: id,
      },
      select: {
        id: true,
        name: true,
        leaderId: true,
        openSlots: true,
        description: true,
        endDate: true,
        members: true,
      },
    });

    const teamsWithLeaders = await Promise.all(
      teamData.map(async (team) => {
        const leader = await this.prisma.user.findUnique({
          where: { id: team.leaderId },
          select: { id: true, name: true, profile: true, student_id: true },
        });
        return { ...team, leader };
      }),
    );

    return teamsWithLeaders;
  }

  async getUserStatus(
    competitionId: string,
    userId: string,
  ): Promise<{
    isJoined: boolean;
    hasTeam: boolean;
    isLeader: boolean;
    teamDetails: any;
    reimburseDetail: Reimbursement;
    competitionResult: any;
    hasReimburse: boolean;
  }> {
    const participant = await this.prisma.competitionParticipant.findFirst({
      where: { userId, competitionId },
    });
    
    console.log(participant)

    const team = participant?.teamId
      ? await this.prisma.team.findUnique({
          where: { id: participant.teamId },
          select: {
            id: true,
            name: true,
            openSlots: true,
            leaderId: true,
          },
        })
      : null;

    console.log(team)

    const isLeader = team?.leaderId === userId;
    const hasReimburse = !!(await this.prisma.reimbursement.findFirst({
      where: { userId, competitionId },
    }));
    const reimburseDetail = await this.prisma.reimbursement.findFirst({
      where: { userId, competitionId },
    });
    const competitionResult = await this.prisma.competitionResult.findFirst({
      where: { userId, competitionId },
      select: {result: true, evidenceUrl: true}
    })

    return {
      isJoined: !!participant,
      hasTeam: !!team,
      isLeader: !!isLeader,
      teamDetails: team,
      reimburseDetail: reimburseDetail,
      competitionResult: competitionResult,
      hasReimburse,
    };
  }

  async getCompetitionMembers(competitionId: string, leaderId: string) {
    try {
      const team = await this.prisma.team.findFirst({
        where: { leaderId, competitionId },
        select: { leaderId: true, members: true },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const leader = await this.prisma.user.findUnique({
        where: { id: team.leaderId },
        select: { id: true, name: true, profile: true, student_id: true },
      });

      const members = await this.prisma.user.findMany({
        where: { id: { in: team.members } },
        select: { id: true, name: true, profile: true, student_id: true },
      });

      return { leader, members };
    } catch (error) {
      throw new BadRequestException('Failed to get competition members');
    }
  }

  async uploadResult(
    competitionId: string,
    userId: string,
    competitionDto: { result: string; evidenceUrl?: string, certificateUrl: string },
  ) {
    const participant = await this.prisma.competitionParticipant.findFirst({
      where: { competitionId, userId },
    });

    if (!participant) {
      throw new NotFoundException(
        'You are not registered for this competition.',
      );
    }

    const existingResult = await this.prisma.competitionResult.findFirst({
      where: { competitionId, userId },
    });

    if (existingResult) {
      throw new BadRequestException(
        'Result already exists for this competition and user.',
      );
    }

    if (!participant.resultId) {
      throw new BadRequestException('Participant does not have a result ID');
    }

    const result = await this.prisma.competitionResult.update({
      where: {
        id: participant.resultId,
      },
      data: {
        result: competitionDto.result,
        statusUrl: competitionDto.certificateUrl,
        evidenceUrl: competitionDto.evidenceUrl,
        updatedAt: new Date(),
      },
    });

    await this.prisma.competitionParticipant.update({
      where: { id: participant.id },
      data: { resultId: result.id },
    });

    return { message: 'Result successfully uploaded.', result };
  }
}
