import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MajorType } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(private prismaService: PrismaService) {}

  async getTeams(userId: string) {
    try {
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
      throw new HttpException('Could not fetch teams', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCompetitions(userId: string) {
    try {
      const competitionParticipants =
        await this.prismaService.competitionParticipant.findMany({
          where: {
            userId: userId,
          },
          select: {
            competitionId: true,
          },
        });

      const competitionIds = competitionParticipants.map(
        (participant) => participant.competitionId,
      );

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
          level: true,
        },
      });

      return competitions;
    } catch (err) {
      console.error('Error fetching competitions:', err);
      throw new HttpException('Could not fetch competitions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getReimburses(userId: string) {
    try {
      const reimburses = await this.prismaService.reimbursement.findMany({
        where: {
          userId: userId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          userId: true,
          competitionId: true,
        },
      });

      const user = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          profile: true,
          student_id: true,
        },
      });

      const response = reimburses.map((reimburse) => ({
        ...reimburse,
        user: user
          ? {
              studentId: user.student_id,
              name: user.name,
              profile: user.profile,
            }
          : null,
      }));

      return response;
    } catch (err) {
      console.error('Error fetching reimburses:', err);
      throw new HttpException('Could not fetch reimburses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getReimburseDetail(id: string) {
    try {
      const reimburses = await this.prismaService.reimbursement.findUnique ({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          status: true,
          cardNumber: true,
          receiptUrl: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          competitionId: true,
        },
      });

      return reimburses;
    } catch (err) {
      console.error('Error fetching reimburse detail:', err);
      throw new HttpException('Could not fetch reimburse detail', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(
    id: string,
    data: { firstname: string; lastname: string; major: MajorType; imgprofile: string; password: string }
  ) {
    try {
      const Major = await this.prismaService.major.findFirst({
        where: { major: data.major },
        select: { id: true },
      });

      if (!Major) {
        throw new HttpException('Major not found', HttpStatus.NOT_FOUND);
      }

      const updatedProfile = await this.prismaService.user.update({
        where: { id: id },
        data: {
          firstName: data.firstname,
          lastName: data.lastname,
          majorId: Major.id,
          profile: data.imgprofile,
          password: data.password,
        },
      });

      const returnValue = {
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        major: data.major,
        profile: updatedProfile.profile,
        password: updatedProfile.password
      }

      return returnValue;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw new HttpException('Could not update profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
