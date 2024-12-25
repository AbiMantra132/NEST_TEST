import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Patch,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { CompetitionService } from './competition.service';
import {
  CreateCompetitionDto,
  UpdateCompetitionDto,
  CreateTeamDto,
  JoinCompetitionDto,
  ReimburseDto,
  StatusDTO,
} from './dto/index';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import MulterOptions from 'src/config/multer.config';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('competitions')
export class CompetitionController {
  constructor(
    private readonly competitionService: CompetitionService,
    private cloudinaryService: CloudinaryService,
  ) {}

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

  @Get('/')
  async findAll() {
    try {
      return await this.competitionService.findAll();
    } catch (error) {
      throw new HttpException(
        `Error finding competitions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/:id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.competitionService.findOne(id);
    } catch (error) {
      throw new HttpException(
        `Error finding competition with id ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('/:id')
  @UseInterceptors(FileInterceptor('poster', MulterOptions))
  async update(
    @Param('id') id: string,
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

  @Delete('/:id')
  async remove(@Param('id') id: string) {
    try {
      const competition = await this.competitionService.remove(id);
      await this.cloudinaryService.deleteCompetitionPoster(
        competition.imagePoster,
      );

      return competition;
    } catch (error) {
      throw new HttpException(
        `Error removing competition with id ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/join')
  async joinCompetition(
    @Param('id') id: string,
    @Body() joinDto: JoinCompetitionDto,
  ) {
    try {
      const competition = await this.competitionService.findOne(id);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }
      await this.competitionService.joinCompetition(id, joinDto);
      return { msg: 'successfully joined competition' };
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/team')
  async createTeam(@Param('id') id: string, @Body() teamDto: CreateTeamDto) {
    try {
      const competition = await this.competitionService.findOne(id);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }
      return await this.competitionService.createTeam(id, teamDto);
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/:id/teams')
  async getTeams(@Param('id') id: string) {
    try {
      const competition = await this.competitionService.findOne(id);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }
      return await this.competitionService.getTeams(id);
    } catch (error) {
      throw new HttpException(
        `Error retrieving teams for competition with id ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/reimburse')
  @UseInterceptors(FileInterceptor('image', MulterOptions))
  async submitReimbursement(
    @Param('id') id: string,
    @Body() reimburseDto: ReimburseDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const competition = await this.competitionService.findOne(id);

      const url = await this.cloudinaryService.uploadReceipt(file);

      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }

      return await this.competitionService.submitReimbursement(
        id,
        reimburseDto,
        url.secure_url,
      );
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/verify-reimbursement')
  async verifyReimbursement(
    @Param('id') id: string,
    @Body('status') status: 'PENDING' | 'PROCESS' | 'APPROVED' | 'REJECTED',
  ) {
    try {
      const competition = await this.competitionService.findOne(id);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }

      return await this.competitionService.verifyReimbursement(id, status);
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/user-status')
  async getUserStatus(
    @Param('id') competitionId: string,
    @Query('userId') userId: string,
  ) {
    try {
      const competition = await this.competitionService.findOne(competitionId);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }

      const status = await this.competitionService.getUserStatus(
        competitionId,
        userId,
      );
      return status;
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/members')
  async getCompetitionMembers(
    @Param('id') id: string,
    @Body() leaderId: string,
  ) {
    try {
      const competition = await this.competitionService.findOne(id);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }
      return await this.competitionService.getCompetitionMembers(id, leaderId);
    } catch (error) {
      throw new HttpException(
        `Error retrieving members for competition with id ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/:id/upload-result')
  @UseInterceptors(FilesInterceptor('files', 2, MulterOptions))
  async uploadResult(
    @Param('id') competitionId: string,
    @Body() body: { userId: string; result: string },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const competition = await this.competitionService.findOne(competitionId);
      if (!competition) {
        throw new HttpException('Competition not found', HttpStatus.NOT_FOUND);
      }

      const evidenceFile = files?.find((file) => file.fieldname === 'evidence');
      const certificateFile = files?.find(
        (file) => file.fieldname === 'certificate',
      );

      let evidenceUrl: string | undefined;
      if (evidenceFile) {
        const uploadResult =
          await this.cloudinaryService.uploadEvidence(evidenceFile);
        evidenceUrl = uploadResult.secure_url;
      }

      let certificateUrl: string | undefined;
      if (certificateFile) {
        const uploadResult =
        await this.cloudinaryService.uploadCertificate(certificateFile);
        certificateUrl = uploadResult.secure_url;
      }

      return await this.competitionService.uploadResult(
        competitionId,
        body.userId,
        {
          result: body.result,
          evidenceUrl, 
          certificateUrl 
        },
      );
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
