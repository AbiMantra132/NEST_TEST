import { Controller, Post, Body, Param, Get, Put } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MajorType } from '@prisma/client';
import { Patch } from '@nestjs/common';


@Controller('profile')
export class ProfileController {
constructor(private readonly profileService: ProfileService) {}
@Put ("/:id")
async updateProfile(
  @Body() body: { firstname: string; lastname: string; major: MajorType; imgprofile: string; password: string },
  @Param('id') id: string
) {
  try {
    const { firstname, lastname, major, imgprofile, password } = body;
    return await this.profileService.updateProfile(id, { firstname, lastname, major, imgprofile, password });
  } catch (err) {
    console.error('Error in updateProfile controller:', err);
    throw new HttpException('Could not update profile', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

@Post("/teams")
async getTeams(@Body() body: { userId: string }) {
  try {
    const { userId } = body;
    return await this.profileService.getTeams(userId);
  } catch (err) {
    console.error('Error in getTeams controller:', err);
    throw new HttpException('Could not fetch teams', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

@Post("/competitions")
async getCompetitions(@Body() body: { userId: string }) {
  try {
    const { userId } = body;
    return await this.profileService.getCompetitions(userId);
  } catch (err) {
    console.error('Error in getCompetitions controller:', err);
    throw new HttpException('Could not fetch competitions', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

@Post("/reimburses")
async getReimburses(@Body() body: { userId: string }) {
  try {
    const { userId } = body;
    return await this.profileService.getReimburses(userId);
  } catch (err) {
    console.error('Error in getReimburses controller:', err);
    throw new HttpException('Could not fetch reimburses', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

@Get("/reimburses/:id")
async getReimburseDetail(@Param('id') id: string) {
  try {
    return await this.profileService.getReimburseDetail(id);
  } catch (err) {
    console.error('Error in getReimburseDetail controller:', err);
    throw new HttpException('Could not fetch reimburse detail', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

}
