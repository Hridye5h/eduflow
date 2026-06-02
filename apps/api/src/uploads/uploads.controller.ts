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

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @SchoolId() schoolId: string,
  ) {
    if (!file) throw new BadRequestException('file field required (multipart/form-data)');
    return this.uploads.upload(file, schoolId);
  }
}
