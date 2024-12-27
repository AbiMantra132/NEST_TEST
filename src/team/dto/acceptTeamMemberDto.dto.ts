 export class AcceptTeamMemberDto {
  leaderId: string;
  memberId: string;
  action: "approve" | "reject";
}
