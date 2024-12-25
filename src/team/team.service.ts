import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Team, User } from '@prisma/client';
import {
  AcceptTeamMemberDto,
  JoinTeamDto,
  StopTeamDto,
  CreateTeamDto,
} from './dto/index';

@Injectable()
export class TeamService {
  private returnAllTeamDTO = {
    id: true,
    name: true,
    competitionId: true,
    leaderId: true,
    members: true,
    openSlots: true,
    description: true,
  };

  constructor(private prisma: PrismaService) {}

  async getAllTeam(): Promise<any> {
    try {
      const teams = await this.prisma.team.findMany({
        select: this.returnAllTeamDTO,
      });

      const teamsWithDetails = await Promise.all(
        teams.map(async (team) => {
          const leader = await this.prisma.user.findUnique({
            where: { id: team.leaderId },
            select: {
              id: true,
              name: true,
              profile: true,
              student_id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });

          const members = await Promise.all(
            team.members.map(async (memberId) => {
              return await this.prisma.user.findUnique({
                where: { id: memberId },
                select: {
                  id: true,
                  name: true,
                  profile: true,
                  student_id: true,
                },
              });
            }),
          );

          const competition = await this.prisma.competition.findUnique({
            where: { id: team.competitionId },
            select: { title: true, id: true },
          });

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            leader,
            competition,
            members,
          };
        }),
      );

      return teamsWithDetails;
    } catch (error) {
      throw new BadRequestException('Failed to fetch teams');
    }
  }

  async getTeamById(id: string): Promise<any> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id },
        select: this.returnAllTeamDTO,
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${id} not found`);
      }

      const leader = await this.prisma.user.findUnique({
        where: {
          id: team.leaderId,
        },
        select: {
          id: true,
          name: true,
          profile: true,
          student_id: true,
          firstName: true,
          lastName: true,
        },
      });

      const member = await Promise.all(
        team.members.map(async (memberId) => {
          return await this.prisma.user.findUnique({
            where: { id: memberId },
            select: {
              id: true,
              name: true,
              profile: true,
              student_id: true,
            },
          });
        }),
      );

      const competition = await this.prisma.competition.findUnique({
        where: { id: team.competitionId },
        select: { title: true, id: true },
      });

      const enrichedTeam = {
        ...team,
        leader,
        member,
        competition
      };

      return { team: enrichedTeam };
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

      const existingParticipation =
        await this.prisma.competitionParticipant.findFirst({
          where: {
            userId: dto.userId,
            competitionId: team.competitionId,
          },
        });

      if (existingParticipation) {
        throw new BadRequestException(
          'User is already participating in this competition',
        );
      }

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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
        throw new BadRequestException(
          'Only team leader can stop team publication',
        );
      }

      // Set openSlots to 0 to prevent new joins
      return await this.prisma.team.update({
        where: { id: dto.teamId },
        data: { openSlots: 0 },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to accept team member');
    }
  }
}
