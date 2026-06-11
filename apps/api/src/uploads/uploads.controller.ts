import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SchoolId } from '../common/tenant.decorator';
import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// The legitimate upload types (matches the web FileUpload accept list) minus
// image/svg+xml, which can carry script and would be served as renderable XSS.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
        cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @SchoolId() schoolId: string,
  ) {
    if (!file) throw new BadRequestException('file field required (multipart/form-data)');
    return this.uploads.upload(file, schoolId);
  }
}
