export class CreateTeamDto {
  name: string;
  leader: string;
  members?: string[];
  maxMembers?: number;
}
