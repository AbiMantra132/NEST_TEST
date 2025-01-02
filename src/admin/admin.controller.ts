import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  Put,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import MulterOptions from '../config/multer.config';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
} from '../competition/dto/index';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CompetitionService } from '../competition/competition.service';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly competitionService: CompetitionService,
    private readonly adminService: AdminService,
  ) {}

  @Get('/')
  async getAllReimburseData() {
    try {
      return await this.adminService.getReimburesData();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch reimburse data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reimburse/:idReimburse')
  async getReimburseById(@Param('idReimburse') idReimburse: string) {
    try {
      return await this.adminService.getReimburseDetail(idReimburse);
    } catch (err) {
      console.error('Error in getReimburseDetail controller:', err);
      throw new HttpException(
        'Could not fetch reimburse detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reimburse/:idReimburse/approve')
  approveReimburse(@Param('idReimburse') idReimburse: string) {
    try {
      // Logic to approve reimburse
      return { message: 'Reimburse approved successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to approve reimburse');
    }
  }

  @Post('reimburse/:idReimburse/reject')
  rejectReimburse(@Param('idReimburse') idReimburse: string) {
    try {
      // Logic to reject reimburse
      return { message: 'Reimburse rejected successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to reject reimburse');
    }
  }

  @Get('competition')
  async getAllCompetitions() {
    try {
      return await this.competitionService.findAll();
    } catch (error) {
      throw new HttpException(
        `Error finding competitions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('competition/create')
  @Post('/create')
  @UseInterceptors(FileInterceptor('poster', MulterOptions))
  async createCompetition(
    @Body() competitionDto: CreateCompetitionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException(
          'Poster file is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const url = await this.cloudinaryService.uploadPoster(file);

      return await this.competitionService.create(
        url.secure_url,
        competitionDto,
      );
    } catch (error) {
      throw new HttpException(
        `Error creating competition: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('competition/:idCompetition/edit')
  @UseInterceptors(FileInterceptor('poster', MulterOptions))
  async editCompetition(
    @Param('idCompetition') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateDto: UpdateCompetitionDto,
  ) {
    try {
      let url = '';
      if (File) {
        const dataImage = await this.cloudinaryService.uploadPoster(file);
        url = dataImage.secure_url;
      }

      const previousPost = await this.competitionService.findOne(id);
      if (!previousPost) {
        throw new HttpException(
          `Competition with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (url) await this.cloudinaryService.deleteCompetitionPoster(url);

      return await this.competitionService.update(url, id, updateDto);
    } catch (error) {
      throw new HttpException(
        `Error updating competition with id ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('competition/:idCompetition')
  async getCompetitionById(@Param('idCompetition') idCompetition: string) {
    try {
      return await this.competitionService.findOne(idCompetition);
    } catch (error) {
      throw new HttpException(
        `Error finding competition with id ${idCompetition}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('competition/:idCompetition/delete')
  async deleteCompetition(@Param('idCompetition') idCompetition: string) {
    try {
      const competition = await this.competitionService.remove(idCompetition);
      await this.cloudinaryService.deleteCompetitionPoster(
        competition.imagePoster,
      );

      return competition;
    } catch (error) {
      throw new HttpException(
        `Error removing competition with id ${idCompetition}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
