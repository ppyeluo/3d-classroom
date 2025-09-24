import { IsString, IsMobilePhone, IsNotEmpty, Length } from 'class-validator';

export class CreateUserDto {
  @IsMobilePhone('zh-CN', {}, { message: '请输入正确的手机号' })
  phone: string;

  @IsString({ message: '姓名必须为字符串' })
  @IsNotEmpty({ message: '姓名不能为空' })
  name: string;

  @IsString({ message: '学科必须为字符串' })
  @IsNotEmpty({ message: '学科不能为空' })
  subject: string;

  @IsString({ message: '学段必须为字符串' })
  @IsNotEmpty({ message: '学段不能为空' })
  grade: string;

  @IsString({ message: '密码必须为字符串' })
  @Length(6, 20, { message: '密码长度需在 6-20 位之间' })
  password: string;
}