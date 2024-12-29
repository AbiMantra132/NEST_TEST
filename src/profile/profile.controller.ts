import { Controller, Post, Body, Param, Get, Put } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MajorType } from '@prisma/client';
import { Patch } from '@nestjs/common';
import MulterOptions from 'src/config/multer.config';
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';


@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService, private cloudinaryService: CloudinaryService) {}

  @Patch('/:id')
  @UseInterceptors(FileInterceptor('profile', MulterOptions))
  async updateProfile(
    @Body()
    body: {
      firstname?: string;
      lastname?: string;
      major?: MajorType;
      password?: string;
    },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Delete the old profile image if a new one is uploaded
    if(file) {
      const existingProfile = await this.profileService.getProfileById(id);    
      if (existingProfile && existingProfile.profile) {
        await this.cloudinaryService.deleteProfileImage(existingProfile.profile);
      }
      await this.cloudinaryService.deleteProfileImage(file.path);
    }
    try {
      const { firstname, lastname, major, password } = body;
      return await this.profileService.updateProfile(id, {
        firstname,
        lastname,
        major,
        password
      });
    } catch (err) {
      console.error('Error in updateProfile controller:', err);
      throw new HttpException(
        'Could not update profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/teams')
  async getTeams(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      return await this.profileService.getTeams(userId);
    } catch (err) {
      console.error('Error in getTeams controller:', err);
      throw new HttpException(
        'Could not fetch teams',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/competitions')
  async getCompetitions(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      return await this.profileService.getCompetitions(userId);
    } catch (err) {
      console.error('Error in getCompetitions controller:', err);
      throw new HttpException(
        'Could not fetch competitions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/reimburses')
  async getReimburses(@Body() body: { userId: string }) {
    try {
      const { userId } = body;
      return await this.profileService.getReimburses(userId);
    } catch (err) {
      console.error('Error in getReimburses controller:', err);
      throw new HttpException(
        'Could not fetch reimburses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/reimburses/:id')
  async getReimburseDetail(@Param('id') id: string) {
    try {
      return await this.profileService.getReimburseDetail(id);
    } catch (err) {
      console.error('Error in getReimburseDetail controller:', err);
      throw new HttpException(
        'Could not fetch reimburse detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
