import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Team } from '@prisma/client';
import { AcceptTeamMemberDto, JoinTeamDto, StopTeamDto, CreateTeamDto } from './dto/index';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getTeamById(id: string): Promise<Team> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${id} not found`);
      }

      return team;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch team');
    }
  }


  async joinTeam(teamId: string, dto: JoinTeamDto): Promise<Team> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }

      if (team.openSlots === 0) {
        throw new BadRequestException('Team is already full');
      }

      if (team.members.includes(dto.userId)) {
        throw new BadRequestException('User is already a member of this team');
      }

      // Check if user is already in another team for this competition
      const existingParticipation = await this.prisma.competitionParticipant.findFirst({
        where: {
          userId: dto.userId,
          competitionId: team.competitionId,
        },
      });

      if (existingParticipation) {
        throw new BadRequestException('User is already participating in this competition');
      }

      // Create pending participation
      await this.prisma.competitionParticipant.create({
        data: {
          userId: dto.userId,
          competitionId: team.competitionId,
          teamId: team.id,
          isLeader: false,
          reimburseStatus: 'PENDING',
        },
      });

      return team;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to join team');
    }
  }

  async stopTeamPublication(dto: StopTeamDto): Promise<Team> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }

      if (team.leaderId !== dto.leaderId) {
        throw new BadRequestException('Only team leader can stop team publication');
      }

      // Set openSlots to 0 to prevent new joins
      return await this.prisma.team.update({
        where: { id: dto.teamId },
        data: { openSlots: 0 },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to stop team publication');
    }
  }

  async acceptTeamMember(dto: AcceptTeamMemberDto): Promise<Team> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
      }

      if (team.leaderId !== dto.leaderId) {
        throw new BadRequestException('Only team leader can accept members');
      }

      if (team.openSlots === 0) {
        throw new BadRequestException('Team is already full');
      }

      // Update team members and open slots
      const updatedTeam = await this.prisma.team.update({
        where: { id: dto.teamId },
        data: {
          members: [...team.members, dto.userId],
          openSlots: team.openSlots - 1,
        },
      });

      // Update competition participant status
      await this.prisma.competitionParticipant.updateMany({
        where: {
          userId: dto.userId,
          teamId: dto.teamId,
        },
        data: {
          reimburseStatus: 'APPROVED',
        },
      });

      return updatedTeam;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to accept team member');
    }
  }
}