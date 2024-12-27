import { TeamService } from './team.service';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JoinTeamDto, AcceptTeamMemberDto, StopTeamDto } from './dto';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async getAllTeams() {
    try {
      return await this.teamService.getAllTeam();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch teams');
    }
  }

  @Get(':id')
  async getTeam(@Param('id') id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Invalid team ID provided');
      }

      const team = await this.teamService.getTeamById(id);
      if (!team) {
        throw new NotFoundException(`Team with ID ${id} not found`);
      }
      return team;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error retrieving team with ID ${id}`,
      );
    }
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  async requestJoinTeam(
    @Param('id') id: string,
    @Body() joinTeamDto: JoinTeamDto,
  ) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid team ID provided');
    }

    if (!joinTeamDto || Object.keys(joinTeamDto).length === 0) {
      throw new BadRequestException('Join team data is required');
    }

    return await this.teamService.joinTeam(id, joinTeamDto);
  }

  @Patch(':id/members')
  async updateMemberStatus(
    @Param('id') id: string,
    @Body() acceptTeamMemberDto: AcceptTeamMemberDto,
  ) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Invalid team ID provided');
      }

      if (
        !acceptTeamMemberDto ||
        Object.keys(acceptTeamMemberDto).length === 0
      ) {
        throw new BadRequestException('Member status update data is required');
      }

      return await this.teamService.acceptTeamMember(
        id,
        acceptTeamMemberDto.leaderId,
        acceptTeamMemberDto.memberId,
        acceptTeamMemberDto.action,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to update member status');
    }
  }

  @Post(':id/stopPublication')
  async stopTeam(@Param('id') id: string, @Body() stopTeamDto: StopTeamDto) {
    try {
      if (!id || typeof id !== 'string') {
        throw new BadRequestException('Invalid team ID provided');
      }

      if (!stopTeamDto || Object.keys(stopTeamDto).length === 0) {
        throw new BadRequestException('Stop team data is required');
      }

      return await this.teamService.stopTeamPublication(
        id,
        stopTeamDto.leaderId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to stop team');
    }
  }
}
