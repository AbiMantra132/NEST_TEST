export class StatusDTO {
  status: Status;
}

enum Status {
  PENDING,
  PROCESS,
  APPROVED,
  REJECTED
}