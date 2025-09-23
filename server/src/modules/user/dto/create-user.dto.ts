import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'teacher01' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username: string;

  @ApiProperty({ description: '邮箱', example: 'teacher@school.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码（至少6位）', example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '教师姓名', example: '张老师', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: '所属学校', example: '阳光小学', required: false })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiProperty({ description: '教授学科', example: '数学', required: false })
  @IsOptional()
  @IsString()
  subject?: string;
}
