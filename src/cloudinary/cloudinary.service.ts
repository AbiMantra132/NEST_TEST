import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class CloudinaryService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'user_profile',
      });
      
      return result;
    } catch (error) {
      return error;
    }
  }

  async deleteProfileImage(secureUrl: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const publicId = secureUrl.split('/').pop().split('.')[0];
      const result = await cloudinary.uploader.destroy(`user_profile/` + publicId);

      return result;
    } catch (error) {
      return error;
    }
  }

  async uploadPoster(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'competition_poster',
      });
      
      return result;
    } catch (error) {
      return error;
    }
  }

  async deleteCompetitionPoster(secureUrl: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const publicId = secureUrl.split('/').pop().split('.')[0];
      const result = await cloudinary.uploader.destroy(`competition_poster/` + publicId);

      return result;
    } catch (error) {
      return error;
    }
  }

  async uploadReceipt(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'receipt',
      });
      
      return result;
    } catch (error) {
      return error;
    }
  }

  async uploadEvidence(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'evidence',
      });
      
      return result;
    } catch (error) {
      return error;
    }
  }

  async deleteEvidence (secureUrl: string): Promise<UploadApiResponse | UploadApiErrorResponse>  {
    try {
      const publicId = secureUrl.split('/').pop().split('.')[0];
      const result = await cloudinary.uploader.destroy(`evidence/` + publicId);

      return result;
    } catch (error) {
      return error;
    }
  }

  async uploadCertificate(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'certificate',
      });
      
      return result;
    } catch (error) {
      return error;
    }
  }

  async deleteCertificate (secureUrl: string): Promise<UploadApiResponse | UploadApiErrorResponse>  {
    try {
      const publicId = secureUrl.split('/').pop().split('.')[0];
      const result = await cloudinary.uploader.destroy(`certificate/` + publicId);

      return result;
    } catch (error) {
      return error;
    }
  }
}
