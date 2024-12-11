import { MajorType } from '@prisma/client';

export class SignupDto {
  name: string;
  email: string;
  password: string;
  nim: string;
  major: MajorType;
}
