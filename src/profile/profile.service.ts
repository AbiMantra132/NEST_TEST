import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { $Enums, MajorType } from '@prisma/client';

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

      return reimburses;
    } catch (err) {
      console.error('Error fetching reimburse detail:', err);
      throw new HttpException('Could not fetch reimburse detail', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProfile(
    id: string,
    data: { firstname?: string; lastname?: string; major?: MajorType; password?: string, gender?: string, cohort?: string, student_id?: string, newProfile?: string },
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

      let updatedProfile: { id: string; name: string; createdAt: Date; updatedAt: Date; student_id: string; firstName: string | null; lastName: string | null; email: string; otp: string; gender: string | null; role: $Enums.Role; password: string; cohort: string; profile: string | null; majorId: string; };

      if(data.newProfile !== undefined && data.newProfile.length > 0) {
        updatedProfile = await this.prismaService.user.update({
          where: { id: id },
          data: {
            firstName: data.firstname,
            lastName: data.lastname,
            majorId: majorId,
            profile: data.newProfile !== undefined && data.newProfile.length > 0 ? data.newProfile : undefined,
            password: data.password,
            gender: data.gender,
            cohort: data.cohort,
            student_id: data.student_id,
          },
        });
      } else {
      updatedProfile = await this.prismaService.user.update({
        where: { id: id },
        data: {
          firstName: data.firstname,
          lastName: data.lastname,
          majorId: majorId,
          password: data.password,
          gender: data.gender,
          cohort: data.cohort,
          student_id: data.student_id,
        },
      });
      }


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
