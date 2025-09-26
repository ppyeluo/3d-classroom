import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/webp',
  'image/jpeg',
  'image/png',
] as const;

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '图片文件（支持webp/jpeg/png）',
  })
  @IsNotEmpty({ message: '图片文件不能为空' })
  @Matches(/image\/(webp|jpeg|png)/, {
    message: `图片格式不支持，请上传${ALLOWED_IMAGE_MIME_TYPES.join('/')}格式`,
  })
  file: Express.Multer.File;
}