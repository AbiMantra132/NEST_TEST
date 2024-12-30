import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MajorType } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(private prismaService: PrismaService) {}

  async getProfileById(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (err) {
      console.error('Error fetching user by ID:', err);
      throw new HttpException('Could not fetch user by ID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

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
          openSlots: true,
          members: true,
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

      const memberIds = teams.flatMap((team) => team.members);
      const uniqueMemberIds = [...new Set(memberIds)];

      const members = await this.prismaService.user.findMany({
        where: {
          id: {
            in: uniqueMemberIds,
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
        const teamMembers = team.members.map((memberId) => {
          const member = members.find((member) => member.id === memberId);
          return member
        ? {
            studentId: member.student_id,
            name: member.name,
            profile: member.profile,
          }
        : null;
        });

        return {
          ...team,
          leader: leader
        ? {
            studentId: leader.student_id,
            name: leader.name,
            profile: leader.profile,
          }
        : null,
          members: teamMembers,
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
          type: true,
          createdAt: true,
          updatedAt: true,
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
    data: { firstname?: string; lastname?: string; major?: MajorType; imgprofile?: string; password?: string, gender?: string, cohort?: string, student_id?: string },
  ) {
    try {
      let majorId = undefined;
      if (data.major) {
        const Major = await this.prismaService.major.findFirst({
          where: { major: data.major },
          select: { id: true },
        });

        if (!Major) {
          throw new HttpException('Major not found', HttpStatus.NOT_FOUND);
        }
        majorId = Major.id;
      }

      const updatedProfile = await this.prismaService.user.update({
        where: { id: id },
        data: {
          firstName: data.firstname,
          lastName: data.lastname,
          majorId: majorId,
          profile: data.imgprofile,
          password: data.password,
        },
      });

      const returnValue = {
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        major: data.major,
        profile: updatedProfile.profile,
        password: updatedProfile.password,
        student_id: updatedProfile.student_id,
        cohort: updatedProfile.cohort,
        email: updatedProfile.email,
        gender: updatedProfile.gender
      };

      return returnValue;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw new HttpException('Could not update profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
