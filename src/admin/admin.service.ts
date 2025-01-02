import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async getReimburesData() {
    try {
      const reimburses = await this.prismaService.reimbursement.findMany({});

      const competitionIds = reimburses.map(
        (reimburse) => reimburse.competitionId,
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

      const totalReimburses = response.length;
      const approvedReimburses = response.filter(
        (reimburse) => reimburse.status === 'approved',
      );
      const rejectedReimburses = response.filter(
        (reimburse) => reimburse.status === 'rejected',
      );
      const latestReimburses = response
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 10);

      return {
        totalReimburses,
        approvedReimburses: {
          count: approvedReimburses.length,
          data: approvedReimburses,
        },
        rejectedReimburses: {
          count: rejectedReimburses.length,
          data: rejectedReimburses,
        },
        latestReimburses: {
          count: latestReimburses.length,
          data: latestReimburses,
        },
      };
    } catch (err) {
      console.error('Error fetching reimburses:', err);
      throw new HttpException(
        'Could not fetch reimburses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
          bankName: true
        },
      });

      if (!reimburses) {
        throw new HttpException(
          'Reimbursement not found',
          HttpStatus.NOT_FOUND,
        );
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

      const leader = await this.prismaService.user.findUnique({
        where: {
          id: reimburses.userId,
        },
        select: {
          id: true,
          student_id: true,
          profile: true
        },
      });

      const members = await this.prismaService.team.findMany({
        where: {
          leaderId: reimburses.userId,
          competitionId: reimburses.competitionId,
        },
        select: {
          members: true,
        },
      });

      const memberDetails = await this.prismaService.user.findMany({
        where: {
          id: {
            in: members.length > 0 ? members[0].members : [],
          },
        },
        select: {
          id: true,
          name: true,
          student_id: true,
          profile: true
        },
      });

      return {
        ...reimburses,
        competition: {
          ...competition,
          leader: leader || null,
          members: memberDetails,
        },
      };
    } catch (err) {
      console.error('Error fetching reimburse detail:', err);
      throw new HttpException(
        'Could not fetch reimburse detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async approveReimburse(id: string) {
    try {
      await this.prismaService.reimbursement.update({
        where: {
          id: id,
        },
        data: {
          status: 'APPROVED',
        },
      });

      return;
    } catch (err) {
      console.error('Error approving reimburse:', err);
      throw new HttpException(
        'Failed to approve reimburse',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async rejectReimburse(id: string) {
    try {
      await this.prismaService.reimbursement.update({
        where: {
          id: id,
        },
        data: {
          status: 'REJECTED',
        },
      });

      return;
    } catch (err) {
      console.error('Error approving reimburse:', err);
      throw new HttpException(
        'Failed to reject reimburse',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async processReimburse(id: string) {
    try {
      await this.prismaService.reimbursement.update({
        where: {
          id: id,
        },
        data: {
          status: 'PROCESS',
        },
      });

      return;
    } catch (err) {
      console.error('Error approving reimburse:', err);
      throw new HttpException(
        'Failed to reject reimburse',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
