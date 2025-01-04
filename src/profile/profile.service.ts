import { Injectable, HttpException, HttpStatus, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { $Enums, MajorType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
          id: true,
          competitionId: true,
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

      const competitionIds = teams.map((team) => team.competitionId).filter((id) => id !== null);
      const uniqueCompetitionIds = [...new Set(competitionIds)];

      const competitions = await this.prismaService.competition.findMany({
        where: {
          id: {
        in: uniqueCompetitionIds,
          },
        },
        select: {
          id: true,
          title: true,
          level: true
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

        const competition = competitions.find(
          (competition) => competition.id === team.competitionId,
        );

        return {
          ...team,
          leader: leader,
          members: teamMembers,
          competition: competition || null,
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

      if (competitionIds.length === 0) {
        return [];
      }

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

      const competitionResults = await this.prismaService.competitionResult.findMany({
        where: {
          userId: userId,
        },
        select: {
          id: true,
          competitionId: true,
          result: true,
          statusUrl: true,
          evidenceUrl: true,
          createdAt: true,
        },
      });


      const response = competitions.map((competition) => {
        const result = competitionResults.find(
          (result) => result.competitionId === competition.id,
        );
        return {
          ...competition,
          result: result ? result.result : "PESERTA",
          statusUrl: result ? result.statusUrl : null,
          evidenceUrl: result ? result.evidenceUrl : null,
        };
      });

      return response;

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
      });

      const competitionIds = reimburses.map((reimburse) => reimburse.competitionId);
      const competitions = await this.prismaService.competition.findMany({
        where: {
          id: {
            in: competitionIds,
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      const response = reimburses.map((reimburse) => {
        const competition = competitions.find(
          (competition) => competition.id === reimburse.competitionId,
        );
        return {
          ...reimburse,
          competition: competition || null,
        };
      });

      return response;
    } catch (err) {
      console.error('Error fetching reimburses:', err);
      throw new HttpException('Could not fetch reimburses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getReimburseDetail(id: string) {
    try {
      const reimburses = await this.prismaService.reimbursement.findUnique({
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

      if (!reimburses) {
        throw new HttpException('Reimbursement not found', HttpStatus.NOT_FOUND);
      }

      const competition = await this.prismaService.competition.findUnique({
        where: {
          id: reimburses.competitionId,
        },
        select: {
          id: true,
          title: true,
          level: true,
          endDate: true,
          startDate: true,
          description: true,
        },
      });

      return {
        ...reimburses,
        competition: competition || null,
      };
    } catch (err) {
      console.error('Error fetching reimburse detail:', err);
      throw new HttpException('Could not fetch reimburse detail', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(
    id: string,
    data,
    newProfile?: string
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
      where: { id: id },
      });

      if (!user) {
      throw new BadRequestException('User not found.');
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.password);

      if (!isPasswordValid) {
      throw new BadRequestException('Invalid password.');
      }

      let majorId: string | undefined = undefined;
      if (data.major) {
      const major = await this.prismaService.major.findFirst({
        where: { major: data.major },
        select: { id: true },
      });

      if (!major) {
        throw new BadRequestException('Invalid major specified.');
      }
      majorId = major.id;
      }

      await this.prismaService.user.update({
      where: { id: id },
      data: {
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        majorId: majorId,
        profile: newProfile || undefined,
        gender: data.gender || undefined,
        cohort: data.cohort || undefined,
        student_id: data.student_id || undefined,
      },
      });

      const updatedProfile = await this.prismaService.user.findUnique({
      where: { id: id },
      select: {
        firstName: true,
        lastName: true,
        profile: true,
        student_id: true,
        cohort: true,
        email: true,
        gender: true,
      },
      });

      return {
      ...updatedProfile,
      major: data.major,
      };
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err instanceof BadRequestException) {
      throw err;
      }
      throw new InternalServerErrorException('Unable to update profile.');
    }
  }
}
