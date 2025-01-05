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
    const team = await this.prisma.team.findFirst({
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

    await this.prisma.userJoinPending.create({
      data: {
        userId: dto.userId,
        teamId: teamId,
        competitionId: team.competitionId,
      },
    });

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

    // Create notification for team leader
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { name: true },
    });

    await this.prisma.notification.create({
      data: {
        senderId: dto.userId,
        title: 'Permintaan Bergabung Tim',
        message: `${user.name} mengajukan untuk bergabung ke team ${team.name}. pada [${new Date().toLocaleDateString(
          'id-ID',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          },
        )}] `,
        receiverId: team.leaderId,
        teamId: teamId,
      },
    });

    return team;
  }

  async getPendingTeamMembers(teamId: string): Promise<any> {
    try {
      const pendingUsers = await this.prisma.userJoinPending.findMany({
        where: { teamId },
        select: {
          userId: true,
        },
      });

      const users = await Promise.all(
        pendingUsers.map(async (pendingUser) => {
          return await this.prisma.user.findUnique({
            where: { id: pendingUser.userId },
            select: {
              id: true,
              name: true,
              profile: true,
              student_id: true,
            },
          });
        }),
      );

      return users;
    } catch (error) {
      throw new BadRequestException('Failed to fetch pending users');
    }
  }

  async stopTeamPublication(teamId: string, leaderId: string): Promise<any> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }

      if (team.leaderId !== leaderId) {
        throw new BadRequestException(
          'Only team leader or admin can stop team publication',
        );
      }

      const competition = await this.prisma.competition.findUnique({
        where: { id: team.competitionId },
      });

      if (competition && new Date(competition.endDate) < new Date()) {
        await this.prisma.team.update({
          where: { id: teamId },
          data: {
            openSlots: 0,
            status: 'INACTIVE',
          },
        });
        throw new BadRequestException('Competition has expired');
      }

      const leader = await this.prisma.user.findUnique({
        where: { id: team.leaderId },
        select: {
          id: true,
          name: true,
          profile: true,
          student_id: true,
          firstName: true,
          lastName: true,
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

      const teamUpdated = await this.prisma.team.update({
        where: { id: teamId },
        data: {
          openSlots: 0,
          status: 'INACTIVE',
        },
      });

      await this.prisma.notification.deleteMany({
        where: {
          receiverId: leaderId,
          teamId: teamId,
        },
      });

      await this.prisma.userJoinPending.deleteMany({
        where: {
          teamId: teamId,
        },
      });

      const enrichedTeam = {
        id: teamUpdated.id,
        name: teamUpdated.name,
        description: teamUpdated.description,
        openSlots: teamUpdated.openSlots,
        status: teamUpdated.status,
        endDate: competition.endDate, 
        leader,
        members,
        competition,
      };
      return enrichedTeam;
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
  async acceptTeamMember(
    teamId: string,
    leaderId: string,
    memberId: string,
    action: 'approve' | 'reject',
  ): Promise<any> {
    await this.prisma.notification.deleteMany({
      where: {
        receiverId: leaderId,
        teamId: teamId,
      },
    });

    await this.prisma.userJoinPending.deleteMany({
      where: {
        userId: memberId,
        teamId: teamId,
      },
    });

    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }

      if (team.leaderId !== leaderId) {
        throw new BadRequestException(
          'Only team leader can perform this action',
        );
      }

      if (action === 'approve') {
        if (team.openSlots === 0) {
          throw new BadRequestException('Team is already full');
        }

        // Update team members and open slots
        const updatedTeam = await this.prisma.team.update({
          where: { id: teamId },
          data: {
            members: [...team.members, memberId],
            openSlots: team.openSlots - 1,
          },
        });

        // Update competition participant status
        const leaderCompetitionParticipant =
          await this.prisma.competitionParticipant.findFirst({
            where: {
              userId: leaderId,
              teamId,
              competitionId: team.competitionId,
            },
            select: {
              reimburseStatus: true,
              resultId: true,
            },
          });

        await this.prisma.competitionParticipant.create({
          data: {
            userId: memberId,
            competitionId: team.competitionId,
            reimburseStatus: leaderCompetitionParticipant.reimburseStatus,
            resultId: leaderCompetitionParticipant.resultId,
            isLeader: false,
          },
        });

        const leader = await this.prisma.user.findUnique({
          where: { id: team.leaderId },
          select: {
            id: true,
            name: true,
            profile: true,
            student_id: true,
            firstName: true,
            lastName: true,
          },
        });

        const members = await Promise.all(
          updatedTeam.members.map(async (memberId) => {
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

        await this.prisma.notification.deleteMany({
          where: {
            receiverId: leaderId,
            teamId: teamId,
          },
        });

        await this.prisma.userJoinPending.deleteMany({
          where: {
            userId: memberId,
            teamId: teamId,
          },
        });

        const enrichedTeam = {
          id: updatedTeam.id,
          name: updatedTeam.name,
          description: updatedTeam.description,
          openSlots: updatedTeam.openSlots,
          endDate: competition.endDate, 
          leader,
          member: members,
          competition,
        };

        return { enrichedTeam, status: 'approved' };
      } else {
        await this.prisma.notification.deleteMany({
          where: {
            receiverId: leaderId,
            teamId: teamId,
          },
        });

        await this.prisma.userJoinPending.deleteMany({
          where: {
            userId: memberId,
            teamId: teamId,
          },
        });
        return { msg: 'rejected by leader', status: 'rejected' };
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to ${action} team member: ${error.message}`,
      );
    }
  }

  async deleteTeam(teamId: string, leaderId: string): Promise<{message: string}> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }

      if (team.leaderId !== leaderId) {
        throw new BadRequestException('Only team leader can delete the team');
      }

      // Delete all competition participants associated with the team
      await this.prisma.competitionParticipant.deleteMany({
        where: { teamId },
      });

      // Delete all competition results associated with the team
      await this.prisma.competitionResult.deleteMany({
        where: { competitionId: team.competitionId, userId: { in: team.members } },
      });

      // Delete all reimbursement requests associated with the team
      await this.prisma.reimbursement.deleteMany({
        where: { competitionId: team.competitionId, userId: { in: team.members } },
      });

      // delete all pending requests
      await this.prisma.userJoinPending.deleteMany({
        where: { teamId },
      });

      // delete all notification from the leader of the team that is sent by requesting user
      await this.prisma.notification.deleteMany({
        where: {
          receiverId: leaderId,
          teamId: teamId,
        },
      });

      // Delete the team
      await this.prisma.team.delete({
        where: { id: teamId },
      });

      return { message: 'Team successfully deleted' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete team');
    }
  }
}
