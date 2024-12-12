import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  SignupDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  async signup(@Body() signupDto: SignupDto, @Res() response: Response) {
    return this.authService.signup(signupDto, response);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto, @Res() response: Response) {
    return this.authService.login(loginDto, response);
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
