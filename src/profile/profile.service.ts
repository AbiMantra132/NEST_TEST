import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prismaService: PrismaService) {}

  async getTeams(userId: string) {
    try {
      // implementation
      const teams = await this.prismaService.team.findMany({
        where: {
          members: {
            has: userId,
          },
        },
        select: {
          createdAt: true,
          description: true,
          endDate: true,
          name: true,
          leaderId: true,
        },
      });

      const leaderIds = teams.map((team) => team.leaderId);
      const uniqueLeaderIds = [...new Set(leaderIds)];

      const leaders = await this.prismaService.user.findMany({
        where: {
          id: {
            in: uniqueLeaderIds,
          },
        },
        select: {
          id: true,
          name: true,
          profile: true,
          student_id: true,
        },
      });

      const response = teams.map((team) => {
        const leader = leaders.find((leader) => leader.id === team.leaderId);
        return {
          ...team,
          leader: leader
            ? {
                studentId: leader.student_id,
                name: leader.name,
                profile: leader.profile,
              }
            : null,
        };
      });

      return response;
    } catch (err) {
      console.error('Error fetching teams:', err);
      throw new Error('Could not fetch teams');
    }
  }

  async getCompetitions(userId: string) {
    try {
      // implementation
      const competitionParticipants = await this.prismaService.competitionParticipant.findMany({
        where: {
          userId: userId,
        },
        select: {
          competitionId: true,
        },
      });

      const competitionIds = competitionParticipants.map((participant) => participant.competitionId);

      const competitions = await this.prismaService.competition.findMany({
        where: {
          id: {
            in: competitionIds,
          },
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          description: true,
          imagePoster: true,
          category: true,
          level: true
        },
      });

      return competitions;
    } catch (err) {
      console.error('Error fetching competitions:', err);
      throw new Error('Could not fetch competitions');
    }
  }

  async getReimburses() {
    try {
      // implementation
    } catch (err) {
      // error handling
    }
  }

  async getReimburseDetail() {
    try {
      // implementation
    } catch (err) {
      // error handling
    }
  }
}
