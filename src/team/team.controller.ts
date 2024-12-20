import { TeamService } from './team.service';
import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateTeamDto, JoinTeamDto, AcceptTeamMemberDto, StopTeamDto } from './dto';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get(':id')
  getTeam(@Param('id') id: string) {
    return this.teamService.getTeamById(id);
  }

  @Post(':id/join')
  requestJoinTeam(
    @Param('id') id: string,
    @Body() joinTeamDto: JoinTeamDto
  ) {
    return this.teamService.joinTeam(id, joinTeamDto);
  }

  @Patch(':id/members')
  updateMemberStatus(
    @Param('id') id: string,
    @Body() acceptTeamMemberDto: AcceptTeamMemberDto
  ) {
    return this.teamService.acceptTeamMember(acceptTeamMemberDto);
  }

  @Patch(':id/status')
  updateTeamStatus(
    @Param('id') id: string,
    @Body() stopTeamDto: StopTeamDto
  ) {
    return this.teamService.stopTeamPublication(stopTeamDto);
  }

  
}
