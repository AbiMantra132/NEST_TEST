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

  async signup(signupDto: SignupDto): Promise<User> {
    const { name, email, password, nim, major, cohort } = signupDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { student_id: nim },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    // Find the major
    const Usermajor = await this.prisma.major.findFirst({
      where: {
        major: major as MajorType,
      },
    });

    // Hash the password
    const hashedPassword: string = await bcrypt.hash(password, 10);

    // nim validation
    if (nim.length !== 10)
      throw new BadRequestException('Nim Inputed Is Not Valid', {
        cause: new Error('please input a valid nim'),
        description: 'nim is invalid',
      });

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        name: name,
        email,
        password: hashedPassword,
        role: 'USER',
        cohort: cohort,
        otp: '',
        student_id: nim,
        majorId: Usermajor.id,
        updatedAt: new Date(),
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.user.update({
      where: { student_id: user.student_id },
      data: { otp },
    });

    await this.sendEmail(user.email, 'OTP Verification', `Your OTP is: ${otp}`);

    return user;
  }

  async login(loginDto: LoginDto): Promise<User> {
    const { nim, password } = loginDto;

    if (nim.length === 0 || password.length === 0)
      throw new UnauthorizedException('Invalid student id or password.');

    const user = await this.prisma.user.findUnique({
      where: { student_id: nim },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid student id or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid student id or password.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.user.update({
      where: { student_id: user.student_id },
      data: { otp },
    });

    await this.sendEmail(user.email, 'OTP Verification', `Your OTP is: ${otp}`);

    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Email not found.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.prisma.user.update({ where: { email }, data: { otp } });

    await this.sendEmail(email, 'Password Reset OTP', `Your OTP is: ${otp}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword, otp: '' },
    });
  }

  async deleteOtp(studentId: string): Promise<string> {
    try {
      await this.prisma.user.update({
        where: { student_id: studentId },
        data: { otp: '' },
      });
      return 'OTP is deleted from user';
    } catch (error) {
      console.error('Error deleting OTP:', error);
      throw new InternalServerErrorException('Unable to delete OTP');
    }
  }

  generateToken(user: User): string {
    const payload = { user };
    return this.jwtService.sign(payload);
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 465,
        logger: true,
        debug: true,
        secure: true,
        auth: {
          user: 'asia.codepedia@gmail.com',
          pass: 'eswpouseqnuxccfb',
        },
        tls: {
          rejectUnauthorized: true
        }
      });

      const mailOptions = {
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #333;">Verifikasi OTP</h2>
            <p>Pengguna yang terhormat,</p>
            <p>Terima kasih telah mendaftar. Silakan gunakan OTP berikut untuk menyelesaikan proses verifikasi Anda:</p>
            <p style="font-size: 24px; font-weight: bold; color: #333;">${text}</p>
            <p>Jika Anda tidak melakukan tahap apapun dalam website lomba primakara, harap abaikan email ini.</p>
            <p>Salam hormat,<br/>Tim Primakara Lomba</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException(
        'Failed to send email. Please try again later.',
      );
    }
  }
}
