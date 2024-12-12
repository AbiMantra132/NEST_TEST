import { Controller, Post, Body, Res, Req, Get } from '@nestjs/common';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index';
import { AuthService } from './auth.service';
import * as jwt from 'jsonwebtoken';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/verify')
  async verify(
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const token = request.cookies['auth-token'];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded) {
      return response.status(200).json({ loggedIn: true, user: decoded });
    }

    return response.status(401).json({ loggedIn: false });
  }

  @Post('/signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    try {
      const user: User = await this.authService.signup(signupDto);
      const token = this.authService.generateToken(user);

      response.cookie('auth-token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Account registered successfully',
        user: {
          id: user.id,
          student_id: user.student_id,
        },
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Student_Id already exists');
      }

      console.error('Signup error:', error);

      throw new InternalServerErrorException(
        'Unable to process signup request',
      );
    }
  }

  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    try {
      const user: User = await this.authService.login(loginDto);
      const token = this.authService.generateToken(user);
  
      response.cookie('auth-token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
  
       return {
        success: true,
        message: 'Account loggedin successfully',
        user: {
          id: user.id,
          student_id: user.student_id,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Student_Id already exists');
      }

      console.error('Login error:', error);

      throw new InternalServerErrorException(
        'Unable to process login request',
      );
    }
  }

  // @Post('forgot-password')
  // async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
  //   await this.authService.forgotPassword(forgotPasswordDto);
  //   return { message: 'OTP sent to email.' };
  // }

  // @Post('reset-password')
  // async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  //   await this.authService.resetPassword(resetPasswordDto);
  //   return { message: 'Password reset successful.' };
  // }
}
