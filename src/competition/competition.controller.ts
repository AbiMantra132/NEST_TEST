import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CompetitionService } from './competition.service';
import {CreateCompetitionDto,FilterCompetitionDto,UpdateCompetitionDto,deleteCompetitionDto} from "./dto/index";
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import MulterOptions from 'src/config/multer.config';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('competition')
export class CompetitionController {
constructor(private readonly competitionService: CompetitionService, private cloudinaryService: CloudinaryService) {}

@Post('/createCompetition')
@UseInterceptors(FileInterceptor('poster', MulterOptions))
async createCompetition(
  @Body() competitionDto: CreateCompetitionDto,
  @UploadedFile() file: Express.Multer.File,
) {
  try {
    if (!file) {
      throw new HttpException('Poster file is required', HttpStatus.BAD_REQUEST);
    }

    const url = await this.cloudinaryService.uploadPoster(file);

    return await this.competitionService.create(url.secure_url, competitionDto);
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

@Put('/:id')
async update(
  @Param('id') id: string,
  @Body() updateDto: UpdateCompetitionDto,
) {
  try {
    return await this.competitionService.update(id, updateDto);
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
    return await this.competitionService.remove(id);
  } catch (error) {
    throw new HttpException(
      `Error removing competition with id ${id}: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
}
