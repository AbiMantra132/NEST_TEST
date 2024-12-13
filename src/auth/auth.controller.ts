import { Controller, Post, Body, Res, Req, Get } from '@nestjs/common';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import {
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  OtpDto,
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

      return {
        success: true,
        token: token,
        message: 'Account registered successfully',
        user,
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
        secure: true,
        sameSite: 'none',
        maxAge: 3600000,
      });

      return {
        success: true,
        message: 'Account loggedin successfully',
        user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Student_Id already exists');
      }

      console.error('Login error:', error);

      throw new InternalServerErrorException('Unable to process login request');
    }
  }

  @Post('/request-otp')
  async requestOtp(@Body() otpDto: OtpDto) {
    try {
      await this.authService.requestOTP(otpDto.nim);
      return {
        success: true,
        message: 'OTP has been sent to your email.',
      };
    } catch (error) {
      console.error('Request OTP error:', error);
      throw new InternalServerErrorException('Unable to request OTP');
    }
  }

  @Post('/reset-otp')
  async resetOtp(@Body() otpDto: OtpDto) {
    try {
      const user = await this.authService.resetOTP(otpDto.nim);
      return {
        user,
        msg: 'OTP Reseted',
      };
    } catch (error) {
      console.error('Reset OTP error:', error);
      throw new InternalServerErrorException('Unable to reset OTP');
    }
  }

  @Post('/verify-otp')
  async verifyOtp(
    @Body() otpDto: OtpDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    try {
      const isValid = await this.authService.verifyOtp(otpDto.nim, otpDto.otp);

      const token = this.authService.generateToken(isValid.user);

      response.cookie('auth-token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 3600000,
      });
      
      return {
        success: isValid,
        message: isValid ? 'OTP verified successfully.' : 'Invalid OTP.',
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw new InternalServerErrorException('Unable to verify OTP');
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
