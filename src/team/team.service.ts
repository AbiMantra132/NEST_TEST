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
    status: true,
    phone: true, // Added phone field
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
            select: {
              title: true,
              id: true,
              endDate: true,
              level: true,
              category: true,
            },
          });

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            openSlots: team.openSlots,
            endDate: competition.endDate,
            leader,
            competition,
            members,
            phone: team.phone, // Added phone field
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
        select: {
          title: true,
          id: true,
          endDate: true,
          category: true,
          level: true,
        },
      });

      const enrichedTeam = {
        id: team.id,
        name: team.name,
        description: team.description,
        openSlots: team.openSlots,
        endDate: competition.endDate,
        leader,
        member,
        competition,
        phone: team.phone, // Added phone field
      };

      return { team: enrichedTeam };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch team');
    }
  }
}
