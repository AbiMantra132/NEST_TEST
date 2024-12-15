import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from 'cloudinary';


@Injectable()
export class CloudinaryService {
  constructor() {
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
}
