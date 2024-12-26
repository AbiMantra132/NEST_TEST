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
import { SignupDto, LoginDto } from './dto/index';

/**
 * Authentication service responsible for handling user authentication operations.
 * @class AuthService
 * 
 * @description
 * This service provides methods for user authentication, including:
 * - User signup with email verification
 * - User login
 * - OTP (One-Time Password) management
 * - Token generation
 * - Profile management
 * 
 * @methods
 * - signup: Registers a new user with OTP verification
 * - login: Authenticates a user with NIM and password
 * - requestOTP: Generates and sends new OTP to user's email
 * - resetOTP: Resets user's OTP
 * - verifyOtp: Validates user's OTP input
 * - generateToken: Creates JWT token for authenticated user
 * - updateUserProfile: Updates user profile information
 * 
 * @private methods
 * - checkUserExists: Validates if NIM is already registered
 * - findMajor: Retrieves major information from database
 * - validateNim: Ensures NIM meets required format
 * - createUser: Creates new user record in database
 * - generateOtp: Creates random 4-digit OTP
 * - updateUserOtp: Updates user's OTP in database
 * - sendEmail: Sends email using nodemailer
 * 
 * @requires
 * - PrismaService - Database service
 * - JwtService - JWT token service
 * - bcrypt - Password hashing
 * - nodemailer - Email service
 */

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<User> {
    try {
      const { name, email, password, nim, major, cohort } = signupDto;

      // Check for duplicate NIM
      await this.checkUserExists(nim);

      // Validate NIM format
      this.validateNim(nim);

      // Find major
      const userMajor = await this.findMajor(major);
      if (!userMajor) {
        throw new BadRequestException('Invalid major specified.');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long.');
      }

      const hashedPassword: string = await bcrypt.hash(password, 10);

      const user = await this.createUser({
        name,
        email,
        password: hashedPassword,
        cohort,
        nim,
        majorId: userMajor.id,
      }).catch((error) => {
        if (error.code === 'P2002') {
          throw new ConflictException('A user with this information already exists.');
        }
        throw new InternalServerErrorException('Error creating user account.');
      });

      const otp = this.generateOtp();
      await this.updateUserOtp(user.student_id, otp);
      await this.sendEmail(user.email, 'OTP Verification', `Your OTP is: ${otp}`);

      return user;
    } catch (error) {
      if (error instanceof ConflictException || 
          error instanceof BadRequestException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred during signup.');
    }
  }

  async login(loginDto: LoginDto): Promise<User> {
    const { nim, password } = loginDto;

    if (!nim || !password) {
      throw new UnauthorizedException('Invalid student id or password.');
    }

    const user = await this.prisma.user.findUnique({
      where: { student_id: nim },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid student id or password.');
    }

    return user;
  }

  async requestOTP(studentId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { student_id: studentId },
    });
    if (!user) {
      throw new UnauthorizedException('Student ID not found.');
    }

    const otp = this.generateOtp();
    await this.updateUserOtp(studentId, otp);
    await this.sendEmail(user.email, 'Your OTP Code', `Your OTP is: ${otp}`);
  }

  async resetOTP(studentId: string): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { student_id: studentId },
        data: { otp: '' },
      });
    } catch (error) {
      console.error('Error deleting OTP:', error);
      throw new InternalServerErrorException('Unable to delete OTP');
    }
  }

  async verifyOtp(
    studentId: string,
    otp: string,
  ): Promise<{ user: User; status: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { student_id: studentId },
    });

    if (!user || user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    await this.prisma.user.update({
      where: { student_id: studentId },
      data: { otp: '' },
    });

    return { user, status: true };
  }

  generateToken(user: User): string {
    const payload = { user };
    return this.jwtService.sign(payload);
  }

  private async checkUserExists(nim: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { student_id: nim },
    });

    if (existingUser) {
      throw new ConflictException('NIM is already in use.');
    }
  }

  private async findMajor(major: string): Promise<any> {
    return await this.prisma.major.findFirst({
      where: { major: major as MajorType },
    });
  }

  private validateNim(nim: string): void {
    if (nim.length !== 10) {
      throw new BadRequestException('Nim Inputed Is Not Valid', {
        cause: new Error('please input a valid nim'),
        description: 'nim is invalid',
      });
    }
  }

  private async createUser(data: any): Promise<User> {
    return await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'USER',
        cohort: data.cohort,
        otp: '',
        student_id: data.nim,
        majorId: data.majorId,
        updatedAt: new Date(),
      },
    });
  }

  async updateUserProfile(
    urlprofile: string,
    nim: string,
    firstName: string,
    lastName: string,
    gender: string,
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { student_id: nim },
        data: {
          profile: urlprofile,
          firstName,
          lastName,
          gender,
        },
      });
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw new InternalServerErrorException(
        'Failed to update user profile. Please try again later.',
      );
    }
  }

  // Method to delete image profile from Cloudinary
  // async deleteImageProfile(nim: string): Promise<User> {
  //   try {
  //     const user = await this.prisma.user.findUnique({ where: { student_id: nim } });
  //     if (!user) {
  //       throw new UnauthorizedException('Student ID not found.');
  //     }

  //     if (user.profileImage) {
  //       const publicId = user.profileImage.split('/').pop().split('.')[0];
  //       await cloudinary.uploader.destroy(`user_profile/` + publicId);
  //     }

  //     return await this.prisma.user.update({ where: { student_id: nim }, data: { profileImage: '' } });
  //   } catch (error) {
  //     console.error('Error deleting image from Cloudinary:', error);
  //     throw new InternalServerErrorException('Failed to delete image. Please try again later.');
  //   }
  // }

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private async updateUserOtp(studentId: string, otp: string): Promise<void> {
    await this.prisma.user.update({
      where: { student_id: studentId },
      data: { otp },
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        logger: true,
        debug: true,
        secure: true,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: true
        },
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
        `,
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
