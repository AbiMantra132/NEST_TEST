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
  UploadProfileDto
} from './dto/index';
import { cloudinary } from '../config/cloudinary.config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Method to handle user signup
  async signup(signupDto: SignupDto): Promise<User> {
    const { name, email, password, nim, major, cohort } = signupDto;

    await this.checkUserExists(nim);
    const Usermajor = await this.findMajor(major);
    this.validateNim(nim);

    const hashedPassword: string = await bcrypt.hash(password, 10);

    const user = await this.createUser({
      name,
      email,
      password: hashedPassword,
      cohort,
      nim,
      majorId: Usermajor.id,
    });

    const otp = this.generateOtp();
    await this.updateUserOtp(user.student_id, otp);
    await this.sendEmail(user.email, 'OTP Verification', `Your OTP is: ${otp}`);

    return user;
  }

  // Method to handle user login
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

  // Method to request OTP
  async requestOTP(studentId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { student_id: studentId } });
    if (!user) {
      throw new UnauthorizedException('Student ID not found.');
    }

    const otp = this.generateOtp();
    await this.updateUserOtp(studentId, otp);
    await this.sendEmail(user.email, 'Your OTP Code', `Your OTP is: ${otp}`);
  }

  // Method to reset OTP
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

  // Method to verify OTP
  async verifyOtp(studentId: string, otp: string): Promise<{user: User, status: boolean}> {
    const user = await this.prisma.user.findUnique({ where: { student_id: studentId } });

    if (!user || user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    await this.prisma.user.update({
      where: { student_id: studentId },
      data: { otp: '' },
    });

    return {user, status: true};
  }
  

  // Method to generate JWT token
  generateToken(user: User): string {
    const payload = { user };
    return this.jwtService.sign(payload);
  }

  // Method to check if user already exists
  private async checkUserExists(nim: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { student_id: nim },
    });

    if (existingUser) {
      throw new ConflictException('NIM is already in use.');
    }
  }

  // Method to find major by name
  private async findMajor(major: string): Promise<any> {
    return await this.prisma.major.findFirst({
      where: { major: major as MajorType },
    });
  }

  // Method to validate NIM
  private validateNim(nim: string): void {
    if (nim.length !== 10) {
      throw new BadRequestException('Nim Inputed Is Not Valid', {
        cause: new Error('please input a valid nim'),
        description: 'nim is invalid',
      });
    }
  }

  // Method to create a new user
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

  // Method to upload image profile to Cloudinary
  async uploadImageProfile(file: Express.Multer.File, uploadProfile: UploadProfileDto): Promise<User> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'user_profile',
      });

      return await this.prisma.user.update({where: {student_id: uploadProfile.nim}, data: {profileImage: result.secure_url, firstName: uploadProfile.firstName, lastName: uploadProfile.lastName}});
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new InternalServerErrorException('Failed to upload image. Please try again later.');
    }
  }

  // Method to delete image profile from Cloudinary
  async deleteImageProfile(nim: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({ where: { student_id: nim } });
      if (!user) {
        throw new UnauthorizedException('Student ID not found.');
      }

      if (user.profileImage) {
        const publicId = user.profileImage.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`user_profile/` + publicId);
      }

      return await this.prisma.user.update({ where: { student_id: nim }, data: { profileImage: '' } });
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new InternalServerErrorException('Failed to delete image. Please try again later.');
    }
  }

  // Method to post first_name and last_name
  async postName(nim: string, first_name: string, last_name: string): Promise<User> {
    try {
      return await this.prisma.user.update({where: {student_id: nim}, data: {firstName: first_name, lastName: last_name}});
    } catch (error) {
      console.error('Error posting first_name and last_name:', error);
      throw new InternalServerErrorException('Failed to post first_name and last_name. Please try again later.');
    }
  }


  // Method to generate OTP
  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Method to update user OTP
  private async updateUserOtp(studentId: string, otp: string): Promise<void> {
    await this.prisma.user.update({
      where: { student_id: studentId },
      data: { otp },
    });
  }

  // Method to send email
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
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
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
