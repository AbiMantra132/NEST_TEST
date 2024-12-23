import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { User } from '@prisma/client';
import { MajorType } from '@prisma/client';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ token: string, user: User }> {
    const { name, email, password, nim, major } = signupDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    // Find the major
    const Usermajor = await this.prisma.major.findFirst({
      where: {
        major: major as MajorType
      }
    });

    // Hash the password
    const hashedPassword: string = await bcrypt.hash(password, 10);

    // nim validation
    if(nim.length !== 10) throw new BadRequestException('Nim Inputed Is Not Valid', {
      cause: new Error('please input the valid email given by Primakara'),
      description: "Email is Invalid"
    });

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        name: name,
        email,
        password: hashedPassword,
        role: 'USER', // Default role
        otp: '',
        student_id: nim,
        majorId: Usermajor.id,
        updatedAt: new Date(),
      },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return { token, user };
  }

  async login(loginDto: LoginDto): Promise<{ token: string, status: string }> {
    const { email, password } = loginDto;

    // Find the user
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return { token, status: "Logged In" };
  }

  // async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
  //   const { email } = forgotPasswordDto;

  //   // Find the user
  //   const user = await this.prisma.user.findUnique({ where: { email } });
  //   if (!user) {
  //     throw new UnauthorizedException('Email not found.');
  //   }

  //   // Generate OTP
  //   const otp = Math.floor(100000 + Math.random() * 900000).toString();

  //   // Update user with OTP
  //   await this.prisma.user.update({ where: { email }, data: { otp } });

  //   // Send OTP via email
  //   await this.sendEmail(email, 'Password Reset OTP', `Your OTP is: ${otp}`);
  // }

  // async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
  //   const { email, otp, newPassword } = resetPasswordDto;

  //   // Find the user
  //   const user = await this.prisma.user.findUnique({ where: { email } });
  //   if (!user || user.otp !== otp) {
  //     throw new UnauthorizedException('Invalid OTP.');
  //   }

  //   // Hash the new password
  //   const hashedPassword = await bcrypt.hash(newPassword, 10);

  //   // Update user with new password and clear OTP
  //   await this.prisma.user.update({
  //     where: { email },
  //     data: { password: hashedPassword, otp: '' },
  //   });
  // }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  // private async sendEmail(
  //   to: string,
  //   subject: string,
  //   text: string,
  // ): Promise<void> {
  //   const transporter = nodemailer.createTransport({
  //     service: 'Gmail',
  //     auth: {
  //       user: process.env.SMTP_EMAIL,
  //       pass: process.env.SMTP_PASSWORD,
  //     },
  //   });

  //   await transporter.sendMail({
  //     from: process.env.SMTP_EMAIL,
  //     to,
  //     subject,
  //     text,
  //   });
  // }

  // private async generateOTPToken() {

  // }
}
