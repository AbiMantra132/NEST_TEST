export class CreateTeamDto {
  name: string;
  leaderId: string;
  members?: string[];
  maxMembers?: number;
}
