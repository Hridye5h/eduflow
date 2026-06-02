import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export type UploadedFile = {
  url: string;
  publicId: string;
  name: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
};

@Injectable()
export class UploadsService {
  private logger = new Logger(UploadsService.name);
  private ready = false;

  constructor() {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.ready = true;
    } else {
      this.logger.warn('Cloudinary not configured — uploads will fail until env vars are set.');
    }
  }

  async upload(file: Express.Multer.File, schoolId: string): Promise<UploadedFile> {
    if (!this.ready) throw new BadRequestException('File storage not configured on server');
    if (!file?.buffer) throw new BadRequestException('No file provided');

    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `eduflow/${schoolId}`,
          resource_type: 'auto',
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      width: result.width,
      height: result.height,
    };
  }
}
