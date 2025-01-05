export class CreateTeamDto {
  name: string;
  leaderId: string;
  members?: string[];
  description: string;
  openSlots: number;
  endDate: Date;
  phone: string;
}
